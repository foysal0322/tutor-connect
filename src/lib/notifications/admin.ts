// Admin notification fan-out — see NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md
// §XV Phase 5.
//
// Phase 5 makes admins first-class notification recipients. Previously admin
// awareness for student/tutor-submitted events (tutor requests, payments,
// refunds, withdrawals, consultancy bookings, support tickets) flowed only
// through Discord webhooks. This helper writes an in-app Notification row
// for every admin so the existing NotificationBell surface picks them up
// with zero API changes.
//
// Behavior contract:
//   - Additive only. Callers keep their existing Discord/email sends intact.
//   - Never throws into the caller's business transaction: every step is
//     wrapped and errors are logged, matching the existing fire-and-forget
//     pattern used for Discord.
//   - One Notification row per admin (each admin's bell is scoped by their
//     own userId). For N admins you get N rows + N delivery-row sets.

import { prisma } from "../prisma";
import { dispatch } from "./service";
import type { NotificationEvent } from "./types";

export type AdminNotificationEvent = Omit<
  NotificationEvent,
  "userId" | "recipientRoleHint"
>;

// Fan out an in-app notification to every non-blocked admin. Each admin gets
// their own Notification + delivery rows via the standard dispatch path.
export async function notifyAdmins(event: AdminNotificationEvent): Promise<void> {
  let admins: { id: string }[];
  try {
    admins = await prisma.user.findMany({
      where: { role: "ADMIN", isBlocked: false },
      select: { id: true },
    });
  } catch (err) {
    console.error("[notifications] failed to load admin recipients:", err);
    return;
  }

  if (admins.length === 0) return;

  await Promise.all(
    admins.map((a) =>
      dispatch({
        ...event,
        userId: a.id,
        recipientRoleHint: "ADMIN",
      }).catch((err) => {
        console.error("[notifications] admin dispatch failed:", err);
      }),
    ),
  );
}
