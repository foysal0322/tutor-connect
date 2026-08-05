// Outbox sweeper — see NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md §XV Phase 4.
//
// Phase 4's dispatch() writes NotificationDelivery rows in the same DB
// transaction as the Notification row (so the commit boundary is respected)
// and then performs attempt #1 inline. When a channel fails transiently,
// the delivery row is marked RETRYING rather than FAILED — the sweeper is
// what eventually drives those retries to a terminal state.
//
// The sweeper is a plain async function. It is NOT auto-wired to a cron in
// Phase 4 — there is no background-job infrastructure in this project yet.
// Phase 9/12 will schedule it (SSE producer, Vercel Cron, or a queue worker).
// Until then it can be invoked manually from an admin route or test harness.
//
// Backoff is computed from the channel's RetryPolicy and the row's attempts
// counter + updatedAt timestamp, so no schema-level nextAttemptAt column is
// required.

import { prisma } from "../prisma";
import { getChannel, DEFAULT_DISPATCH_CHANNELS } from "./channels";
import { attemptDelivery } from "./delivery";
import type { Notification, NotificationDelivery } from "@prisma/client";

export interface OutboxSweepResult {
  processed: number;
  sent: number;
  failed: number;
  retried: number;
}

function computeBackoffMs(
  policy: { baseDelayMs: number; maxDelayMs: number; multiplier: number },
  attemptsSoFar: number,
): number {
  // attemptsSoFar is the count of attempts already made. The next retry is
  // scheduled at baseDelayMs * multiplier^(attemptsSoFar - 1).
  const exponent = Math.max(0, attemptsSoFar - 1);
  const raw = policy.baseDelayMs * Math.pow(policy.multiplier, exponent);
  return Math.min(raw, policy.maxDelayMs);
}

function isDue(delivery: NotificationDelivery, now: Date): boolean {
  if (delivery.status === "PENDING") return true;
  if (delivery.status !== "RETRYING") return false;
  const channel = getChannel(delivery.channel as any);
  if (!channel) return false;
  if (delivery.attempts >= channel.retryPolicy.maxAttempts) return false;
  const backoff = computeBackoffMs(channel.retryPolicy, delivery.attempts);
  const elapsed = now.getTime() - delivery.updatedAt.getTime();
  return elapsed >= backoff;
}

async function loadNotification(id: string): Promise<Notification | null> {
  return prisma.notification.findUnique({ where: { id } });
}

// attemptDelivery is imported from ./delivery — the same code path used by
// the inline dispatcher, so sweeper retries are byte-identical to attempt #1.

// Process a batch of due deliveries. Idempotent: safe to call concurrently;
// each call works on its own fetched batch. Locking is not implemented here
// — if you wire this to multiple concurrent schedulers, wrap with
// SELECT ... FOR UPDATE SKIP LOCKED or an external coordinator.
export async function processOutbox(options?: {
  batchSize?: number;
  now?: Date;
}): Promise<OutboxSweepResult> {
  const now = options?.now ?? new Date();
  const batchSize = options?.batchSize ?? 50;

  const candidates = await prisma.notificationDelivery.findMany({
    where: { status: { in: ["PENDING", "RETRYING"] } },
    orderBy: { updatedAt: "asc" },
    take: batchSize,
  });

  const due = candidates.filter((d) => isDue(d, now));
  if (due.length === 0) {
    return { processed: 0, sent: 0, failed: 0, retried: 0 };
  }

  // Group by notification to amortize the loadNotification call.
  const notifications = new Map<string, Notification | null>();
  await Promise.all(
    Array.from(new Set(due.map((d) => d.notificationId))).map(async (id) => {
      notifications.set(id, await loadNotification(id));
    }),
  );

  let sent = 0;
  let failed = 0;
  let retried = 0;
  for (const delivery of due) {
    const notification = notifications.get(delivery.notificationId);
    if (!notification) {
      // Notification gone (cascade-deleted between dispatch and sweep). Mark
      // the orphan delivery FAILED so we don't keep re-trying it.
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", lastError: "notification row missing", updatedAt: now },
      });
      failed++;
      continue;
    }
    const result = await attemptDelivery(delivery, notification, now);
    if (result === "sent") sent++;
    else if (result === "failed") failed++;
    else if (result === "retrying") retried++;
  }

  return { processed: due.length, sent, failed, retried };
}

// Re-export for callers that want the default channel list when enqueuing
// outbox-style deliveries without going through dispatch() (future use).
export { DEFAULT_DISPATCH_CHANNELS };
