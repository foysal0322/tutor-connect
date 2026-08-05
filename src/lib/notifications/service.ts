// NotificationService — single entry point for dispatching notifications.
// See NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md §III / §IV.
//
// Phase 3 scope:
//   - typed NotificationEvent envelope
//   - DB write (with Phase 2 columns populated from the event)
//   - web push fan-out (extracted verbatim from the legacy createNotification)
//   - NotificationDelivery rows are NOT written here — that lands in Phase 4
//
// The legacy `createNotification(userId, title, message, actionUrl?)` API
// lives in src/lib/notification.ts and delegates to dispatch() via a raw
// event. Behavior is byte-identical: same DB row, same push payload shape
// {title, body: message, url: actionUrl || '/'}, same 410/404 prune.

import webpush from "web-push";
import { prisma } from "../prisma";
import type { Notification } from "@prisma/client";
import { resolveFromTemplate } from "./templates";
import type {
  NotificationCategory,
  NotificationEvent,
  NotificationMetadata,
  NotificationPriority,
  NotificationType,
  ResolvedNotification,
} from "./types";

// --- VAPID bootstrap (preserved verbatim from the legacy module) -----------
// Runs at first import. If keys are missing, push is silently disabled and
// the in-app row still writes successfully.
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

// Web push fan-out — extracted verbatim from the legacy createNotification.
// Mutates nothing in the DB beyond pruning expired subscriptions (410/404).
async function pushToUserDevices(
  userId: string,
  title: string,
  message: string,
  actionUrl: string | null,
): Promise<void> {
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title,
    body: message,
    url: actionUrl || "/",
  });

  const pushPromises = subscriptions.map(async (sub) => {
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };
    try {
      await webpush.sendNotification(pushSubscription, payload);
    } catch (error: any) {
      // Same pruning rule as the legacy implementation.
      if (error.statusCode === 410 || error.statusCode === 404) {
        await prisma.pushSubscription.delete({ where: { id: sub.id } });
      } else {
        console.error("Error sending push notification:", error);
      }
    }
  });

  await Promise.all(pushPromises);
}

// The canonical dispatch entry point.
//
// Writes the Notification row with the Phase 2 columns populated from the
// event, then fires push fan-out. Push failures never roll back the row —
// this matches the legacy contract. Phase 4 will harden this with delivery
// receipts + retry.
export async function dispatch(event: NotificationEvent): Promise<Notification> {
  const resolved = resolveEvent(event);

  const notification = await prisma.notification.create({
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

  // Fire-and-forget push — preserved exactly as before. We do not await
  // failure propagation into the caller; legacy callers wrap this in try/catch
  // already and we must not change that control flow.
  try {
    await pushToUserDevices(event.userId, resolved.title, resolved.message, resolved.actionUrl);
  } catch (error) {
    console.error("Notification push fan-out failed:", error);
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
}): Promise<Notification> {
  return dispatch({ event: "raw", ...params });
}
