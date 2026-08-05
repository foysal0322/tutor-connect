// NotificationService — single entry point for dispatching notifications.
// See NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md §III / §IV.
//
// Phase 4 scope:
//   - typed NotificationEvent envelope (Phase 3)
//   - DB write (Phase 2 columns populated from event)
//   - NotificationDelivery rows written in the SAME transaction as the
//     Notification row (commit boundary respected)
//   - Channel provider fan-out via the channels registry
//   - Inline attempt #1 per channel; transient failures land in RETRYING
//     and are picked up by the outbox sweeper (processOutbox)
//
// Legacy byte-identity preserved:
//   - createNotification() delegates here via a raw event
//   - default channel set is [IN_APP, PUSH]
//   - push payload shape {title, body, url} unchanged
//   - 410/404 subscription pruning unchanged
//   - caller-visible control flow unchanged: push failures still don't
//     surface to the caller (try/catch in callers continues to wrap silently)

import { prisma } from "../prisma";
import type { Notification, NotificationDelivery } from "@prisma/client";
import { resolveFromTemplate } from "./templates";
import { DEFAULT_DISPATCH_CHANNELS } from "./channels";
import type { ChannelName } from "./channels";
import { attemptDelivery } from "./delivery";
import type {
  NotificationCategory,
  NotificationChannel,
  NotificationEvent,
  NotificationMetadata,
  NotificationPriority,
  NotificationType,
  ResolvedNotification,
} from "./types";

const DEFAULT_TYPE: NotificationType = "SYSTEM";
const DEFAULT_CATEGORY: NotificationCategory = "SYSTEM";
const DEFAULT_PRIORITY: NotificationPriority = "MEDIUM";

// Resolve an event into its persisted shape.
//
// Precedence:
//   1. Explicit title/message on the event (legacy raw path) — wins outright.
//   2. Template registry lookup by `event`.
//   3. Fallback sentinel strings — only reachable if a caller dispatches an
//      event with neither inline text nor a registered template. We log and
//      persist placeholders rather than throw, because throwing here would
//      surface a notification-system failure into a business transaction.
function resolveEvent(event: NotificationEvent): ResolvedNotification {
  if (event.title !== undefined && event.message !== undefined) {
    return {
      title: event.title,
      message: event.message,
      actionUrl: event.actionUrl ?? null,
      type: event.type ?? DEFAULT_TYPE,
      category: event.category ?? DEFAULT_CATEGORY,
      priority: event.priority ?? DEFAULT_PRIORITY,
    };
  }

  const fromTemplate = resolveFromTemplate(event.event, event.metadata);
  if (fromTemplate) {
    return {
      title: fromTemplate.title,
      message: fromTemplate.message,
      actionUrl: event.actionUrl ?? fromTemplate.actionUrl,
      type: event.type ?? fromTemplate.type,
      category: event.category ?? fromTemplate.category,
      priority: event.priority ?? fromTemplate.priority,
    };
  }

  console.error(
    `[notifications] event "${event.event}" had no inline title/message and no registered template; persisting placeholder.`,
  );
  return {
    title: event.title ?? "",
    message: event.message ?? "",
    actionUrl: event.actionUrl ?? null,
    type: event.type ?? DEFAULT_TYPE,
    category: event.category ?? DEFAULT_CATEGORY,
    priority: event.priority ?? DEFAULT_PRIORITY,
  };
}

function resolveChannels(event: NotificationEvent): ChannelName[] {
  if (event.channels && event.channels.length > 0) {
    return event.channels as ChannelName[];
  }
  return DEFAULT_DISPATCH_CHANNELS;
}

// The canonical dispatch entry point.
//
// Step 1: write Notification + PENDING NotificationDelivery rows in a single
//         transaction. If either write fails, neither lands.
// Step 2: after commit, run attempt #1 per channel inline. Push/InApp behave
//         exactly as the pre-Phase-4 path. Transient channel failures mark
//         the delivery RETRYING and are left for the outbox sweeper.
export async function dispatch(event: NotificationEvent): Promise<Notification> {
  const resolved = resolveEvent(event);
  const channelNames = resolveChannels(event);

  const { notification, deliveries } = await prisma.$transaction(async (tx) => {
    const created = await tx.notification.create({
      data: {
        userId: event.userId,
        title: resolved.title,
        message: resolved.message,
        actionUrl: resolved.actionUrl,
        type: resolved.type,
        category: resolved.category,
        priority: resolved.priority,
        ...(event.actorUserId !== undefined && { actorUserId: event.actorUserId }),
        ...(event.recipientRoleHint !== undefined && { recipientRoleHint: event.recipientRoleHint }),
        ...(event.metadata !== undefined && { metadata: event.metadata as object }),
        ...(event.dedupKey !== undefined && { dedupKey: event.dedupKey }),
        ...(event.expiresAt !== undefined && { expiresAt: event.expiresAt }),
      },
    });

    let createdDeliveries: NotificationDelivery[] = [];
    if (channelNames.length > 0) {
      // createMany does not return rows in all Prisma versions; re-fetch.
      await tx.notificationDelivery.createMany({
        data: channelNames.map((name) => ({
          notificationId: created.id,
          channel: name,
          status: "PENDING",
        })),
      });
      createdDeliveries = await tx.notificationDelivery.findMany({
        where: { notificationId: created.id },
        orderBy: { channel: "asc" },
      });
    }

    return { notification: created, deliveries: createdDeliveries };
  });

  // After commit: attempt each channel inline (attempt #1 only). We swallow
  // any error here — channel failures must not propagate into the caller's
  // business-transaction control flow. The delivery row records the outcome.
  if (deliveries.length > 0) {
    await Promise.all(
      deliveries.map(async (delivery) => {
        try {
          await attemptDelivery(delivery, notification);
        } catch (err) {
          // attemptDelivery already updates the row on channel errors. This
          // outer catch only fires if the row-update itself threw (e.g. DB
          // connectivity loss). Log and move on — do not surface.
          console.error("[notifications] delivery attempt crashed:", err);
        }
      }),
    );
  }

  return notification;
}

// Convenience helper for the rare new-path caller that already knows what it
// wants to say. Equivalent to dispatch({ event: "raw", ...inline }).
export async function dispatchRaw(params: {
  userId: string;
  title: string;
  message: string;
  actionUrl?: string;
  type?: NotificationType;
  category?: NotificationCategory;
  priority?: NotificationPriority;
  actorUserId?: string;
  recipientRoleHint?: NotificationEvent["recipientRoleHint"];
  metadata?: NotificationMetadata;
  dedupKey?: string;
  expiresAt?: Date;
  channels?: NotificationChannel[];
}): Promise<Notification> {
  return dispatch({ event: "raw", ...params });
}
