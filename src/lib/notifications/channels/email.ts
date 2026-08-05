// Email channel — functional provider wrapping sendNoReplyEmail.
//
// NOT in the default dispatch channel set for Phase 4. Existing server
// actions call sendNoReplyEmail directly today; auto-wiring email into
// dispatch would double-send. This provider becomes the dispatch surface
// in Phases 5-7 once call sites migrate to typed events.

import { sendNoReplyEmail } from "../../mail";
import type { NotificationChannel, ChannelPayload, ChannelSendOutcome } from "./types";

async function send(payload: ChannelPayload): Promise<ChannelSendOutcome> {
  if (!payload.email) {
    return { status: "FAILED", error: "email payload missing on event" };
  }
  const result: any = await sendNoReplyEmail(payload.email);
  if (result?.success) return { status: "SENT", recipientCount: 1 };
  return {
    status: "FAILED",
    error: String(result?.error ?? "resend send failed"),
  };
}

export const EmailChannel: NotificationChannel = {
  name: "EMAIL",
  send,
  // Email is the most durable channel — give it more attempts than push.
  retryPolicy: { maxAttempts: 5, baseDelayMs: 1_000, maxDelayMs: 16_000, multiplier: 2 },
};
