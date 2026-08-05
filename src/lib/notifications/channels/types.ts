// Channel provider contracts — see NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md §VIII.
//
// Each delivery channel (in-app, email, push, discord, future sms/webhook)
// implements NotificationChannel. The service dispatcher picks channels per
// event and records a NotificationDelivery row per channel.

import type { NotificationChannel as ChannelName, NotificationMetadata } from "../types";

export type { ChannelName };

// Per-subscription / per-recipient payload. Each channel picks the fields it
// needs; the dispatcher passes a superset.
export interface ChannelPayload {
  notificationId: string;
  userId: string;
  title: string;
  message: string;
  actionUrl: string | null;
  metadata?: NotificationMetadata;
  // Channel-specific blocks. Channels that don't need them ignore them.
  email?: { to: string; subject: string; html: string; text?: string };
  discord?: {
    webhook: "NOTIFICATIONS" | "ALERTS" | "REQUESTS";
    content: string;
    embeds?: Array<Record<string, unknown>>;
  };
}

export type ChannelSendStatus = "SENT" | "FAILED" | "EXPIRED";

export interface ChannelSendOutcome {
  status: ChannelSendStatus;
  // Free-form error message on FAILED; persisted as NotificationDelivery.lastError.
  error?: string;
  // Number of successful sub-deliveries (e.g. 3 push endpoints reached).
  // 0 means "nothing actually sent" — used by analytics; does not affect status.
  recipientCount?: number;
}

export interface RetryPolicy {
  // Total attempts including the first inline one. 1 = fire-once.
  maxAttempts: number;
  // First retry delay (ms). Subsequent delays = baseDelayMs * multiplier^(attempt-1).
  baseDelayMs: number;
  maxDelayMs: number;
  multiplier: number;
}

export interface NotificationChannel {
  name: ChannelName;
  send(payload: ChannelPayload): Promise<ChannelSendOutcome>;
  retryPolicy: RetryPolicy;
}
