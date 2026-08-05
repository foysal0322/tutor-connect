// Push channel — web push fan-out via VAPID. Extracted verbatim from the
// pre-Phase-4 createNotification: same payload shape {title, body, url}, same
// per-subscription try/catch, same 410/404 prune rule, same parallel fan-out.
//
// The only behavioral addition is summarizing the outcome so the service can
// record a NotificationDelivery row.

import webpush from "web-push";
import { prisma } from "../../prisma";
import type { NotificationChannel, ChannelPayload, ChannelSendOutcome } from "./types";

// VAPID bootstrap — preserved verbatim from the legacy module so importing
// the PushChannel has the same side effect as importing the old notification.ts.
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:support@nsuone.com",
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
  } catch (error) {
    console.error("Failed to set VAPID details:", error);
  }
} else {
  console.warn("VAPID keys are missing. Web push notifications will be disabled.");
}

async function send(payload: ChannelPayload): Promise<ChannelSendOutcome> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: payload.userId },
  });

  if (subscriptions.length === 0) {
    // Not a failure — user hasn't opted into push. In-app still delivered.
    return { status: "SENT", recipientCount: 0 };
  }

  const pushPayload = JSON.stringify({
    title: payload.title,
    body: payload.message,
    url: payload.actionUrl || "/",
  });

  // Parallel fan-out with per-subscription error handling — same as before.
  const results = await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, pushPayload);
        return { kind: "ok" as const };
      } catch (error: any) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired/gone — prune it (same rule as legacy).
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
          return { kind: "expired" as const };
        }
        console.error("Error sending push notification:", error);
        return { kind: "error" as const, error: String(error?.message ?? error) };
      }
    }),
  );

  const ok = results.filter((r) => r.kind === "ok").length;
  const expired = results.filter((r) => r.kind === "expired").length;
  const errors = results.filter((r) => r.kind === "error");

  if (ok > 0) return { status: "SENT", recipientCount: ok };
  if (errors.length === 0 && expired > 0) {
    // All endpoints gone — treat as expired, not a transient failure.
    return { status: "EXPIRED", recipientCount: expired };
  }
  return {
    status: "FAILED",
    recipientCount: 0,
    error: errors[0]?.error ?? "all push endpoints failed",
  };
}

export const PushChannel: NotificationChannel = {
  name: "PUSH",
  send,
  retryPolicy: { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 4_000, multiplier: 2 },
};
