// Notification preferences resolver — see NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md
// §XV Phase 10.
//
// Per-user × per-category × per-channel matrix. Default = everything ON
// (matches pre-Phase-10 behavior so existing users see no change until they
// opt into muting). Preferences gate which channels actually fire at dispatch
// time; the Notification row is ALWAYS written for audit + the Notification
// Center feed.
//
// Hard rule (blueprint §XVI #10): CRITICAL priority events and AUTH/SECURITY
// categories bypass preferences entirely — they always deliver on every
// available channel. This protects users from accidentally silencing
// security-critical signals (account blocked, password reset, role change).

import { prisma } from "../prisma";
import type { NotificationChannel, NotificationPriority } from "./types";

// Categories where muting would defeat the purpose of the notification.
// Even a user who "muted all" must still receive these. Blueprint §XVI #10.
const NON_MUTABLE_CATEGORIES = new Set(["AUTH", "SECURITY"]);

// Same idea but enforced by the channel matrix being locked in the UI. The
// IN_APP channel is never mutable — the bell is the canonical audit surface.
// EMAIL and PUSH are the user-controllable channels. This matches the
// product decision that in-app muting adds UX ambiguity without clear value
// (users already archive from the Notification Center).
const NON_MUTABLE_CHANNEL: NotificationChannel = "IN_APP";

// Channels a user is allowed to mute per-category. Currently EMAIL and PUSH.
export const MUTABLE_CHANNELS: NotificationChannel[] = ["EMAIL", "PUSH"];

// Channels shown in the preferences UI. IN_APP is included but rendered as
// read-only / always-on so the matrix is self-explanatory.
export const PREFERENCE_CHANNELS: NotificationChannel[] = [
  "IN_APP",
  "EMAIL",
  "PUSH",
];

export interface PreferenceRow {
  category: string;
  channelInApp: boolean;
  channelEmail: boolean;
  channelPush: boolean;
}

// Internal cache of a user's preference rows. Cheap to fetch (indexed on
// userId) and small (one row per category the user has explicitly muted).
async function loadPreferenceMap(
  userId: string,
): Promise<Map<string, PreferenceRow>> {
  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    select: { category: true, channelInApp: true, channelEmail: true, channelPush: true },
  });
  return new Map(rows.map((r) => [r.category, r]));
}

// Pure filter: given a requested channel set and a single preference row,
// return the channels that should actually fire. Extracted from
// getEffectiveChannels so it can be unit-tested without a database.
//
// Bypass rules (blueprint §XVI #10):
//   - priority === "CRITICAL" → return `requested` unchanged (every channel
//     fires).
//   - category ∈ {AUTH, SECURITY} → return `requested` unchanged.
//   - IN_APP is never removed by preferences — it's the audit surface.
//     (Mutable channels are EMAIL and PUSH only.)
//   - Unknown channels (DISCORD/SMS/WEBHOOK) are never removed — they are
//     system/admin-facing or future channels.
export function filterChannelsByPreference(params: {
  category: string;
  priority: NotificationPriority;
  requested: NotificationChannel[];
  row: PreferenceRow | undefined;
}): NotificationChannel[] {
  const { category, priority, requested, row } = params;

  if (priority === "CRITICAL") return requested;
  if (NON_MUTABLE_CATEGORIES.has(category)) return requested;
  if (!row) return requested;

  return requested.filter((channel) => {
    if (channel === NON_MUTABLE_CHANNEL) return true;
    if (channel === "EMAIL") return row.channelEmail;
    if (channel === "PUSH") return row.channelPush;
    return true;
  });
}

// Resolve which channels a notification should actually fire on, given the
// user's stored preferences. Callers in dispatch() use this after computing
// the per-event channel set.
//
// See filterChannelsByPreference for the bypass rules — this is the
// DB-hydrated wrapper around that pure function.
//
// Returns the filtered channel list. If the result is empty (user muted
// every mutable channel), the Notification row is still created with no
// deliveries — effectively a silent record visible only in the Notification
// Center.
export async function getEffectiveChannels(params: {
  userId: string;
  category: string;
  priority: NotificationPriority;
  requested: NotificationChannel[];
}): Promise<NotificationChannel[]> {
  const { userId, category, priority, requested } = params;

  // Hot-path bypass: skip the DB hit entirely for CRITICAL priority and
  // locked categories. This also guarantees correctness even if a stray
  // preference row somehow exists for AUTH/SECURITY.
  if (priority === "CRITICAL") return requested;
  if (NON_MUTABLE_CATEGORIES.has(category)) return requested;

  const prefMap = await loadPreferenceMap(userId);
  return filterChannelsByPreference({
    category,
    priority,
    requested,
    row: prefMap.get(category),
  });
}

// Whether a given category should be locked in the UI (CRITICAL-by-category).
// AUTH and SECURITY are always locked. Other categories are user-mutable.
export function isCategoryLocked(category: string): boolean {
  return NON_MUTABLE_CATEGORIES.has(category);
}
