// Legacy entry point — preserved verbatim as a façade over the new
// NotificationService.dispatch(). See NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md
// §XV Phase 3: "Keep createNotification signature intact as a thin delegator
// so existing call sites still work."
//
// Behavior is byte-identical to the pre-Phase-3 implementation:
//   - DB row carries userId/title/message/actionUrl plus Phase 2 defaults
//     (type="SYSTEM", category="SYSTEM", priority="MEDIUM", etc.)
//   - Push payload is {title, body: message, url: actionUrl || '/'}
//   - 410/404 subscriptions are pruned; other push errors are logged
//
// All six existing call sites continue to import { createNotification } from
// "@/lib/notification" — no diff required at the call sites.

import type { Notification } from "@prisma/client";
import { dispatch } from "./notifications/service";

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string,
): Promise<Notification> {
  return dispatch({
    event: "legacy.raw",
    userId,
    title,
    message,
    actionUrl,
  });
}
