// InApp channel — the Notification row itself IS the in-app delivery.
// The row is written by the service before channel sends run, so this
// provider's send() is a no-op that always succeeds. We still record a
// NotificationDelivery(IN_APP, SENT) row for parity/observability.

import type { NotificationChannel, ChannelPayload, ChannelSendOutcome } from "./types";

async function send(_payload: ChannelPayload): Promise<ChannelSendOutcome> {
  return { status: "SENT", recipientCount: 1 };
}

export const InAppChannel: NotificationChannel = {
  name: "IN_APP",
  send,
  retryPolicy: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0, multiplier: 1 },
};
