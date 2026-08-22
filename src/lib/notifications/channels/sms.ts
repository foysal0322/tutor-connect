// SMS channel — BulkSMSBD provider (https://bulksmsbd.net/api/smsapi).
//
// Opt-in only: never part of DEFAULT_DISPATCH_CHANNELS. Business events that
// want SMS pass channels: [..., "SMS"] on their dispatch envelope. The
// recipient's number is read from User.contact (BD local format 01XXXXXXXXX).
//
// Env:
//   BULKSMSBD_API_KEY    — gateway API key
//   BULKSMSBD_SENDERID   — approved sender id
// Unset vars disable the channel silently (status SENT, recipientCount 0) —
// same skip-behavior as the Discord channel when its webhooks are missing.

import { prisma } from "../../prisma";
import type { NotificationChannel, ChannelPayload, ChannelSendOutcome } from "./types";

const SMS_API_URL = "https://bulksmsbd.net/api/smsapi";

// Single SMS segment cap. Gateway rejects longer bodies on non-unicode plans.
const MAX_MESSAGE_LENGTH = 160;

// Normalize a Bangladeshi number to the 8801XXXXXXXXX format the gateway
// expects. Accepts 01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX, 1XXXXXXXXX.
export function normalizeBdNumber(raw: string): string | undefined {
  const digits = raw.replace(/\D+/g, "");
  if (digits.startsWith("880")) return digits;
  if (digits.startsWith("01") && digits.length === 11) return `88${digits}`;
  if (digits.startsWith("1") && digits.length === 10) return `880${digits}`;
  return undefined;
}

async function send(payload: ChannelPayload): Promise<ChannelSendOutcome> {
  const apiKey = process.env.BULKSMSBD_API_KEY;
  const senderId = process.env.BULKSMSBD_SENDERID;
  if (!apiKey || !senderId) {
    // Gateway not configured in this environment — skip silently.
    return { status: "SENT", recipientCount: 0 };
  }

  let contact: string | null | undefined;
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { contact: true },
    });
    contact = user?.contact;
  } catch (err: any) {
    return { status: "FAILED", error: `sms: user lookup failed: ${String(err?.message ?? err)}` };
  }

  const number = contact ? normalizeBdNumber(contact) : undefined;
  if (!number) {
    return { status: "FAILED", error: `sms: no valid BD phone number on record for user ${payload.userId}` };
  }

  // "Title: message" reads naturally as an SMS; truncate to one segment.
  const message = `${payload.title}: ${payload.message}`.slice(0, MAX_MESSAGE_LENGTH);

  try {
    const res = await fetch(SMS_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        api_key: apiKey,
        senderid: senderId,
        number,
        message,
      }),
    });

    // Gateway answers with JSON: {response_code, success_message?|error_message?}.
    const body = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(body);
    } catch {
      // Non-JSON body — fall back to HTTP status below.
    }

    if (parsed?.error_message) {
      return { status: "FAILED", error: `sms gateway: ${parsed.error_message}` };
    }
    if (!res.ok && !parsed) {
      return { status: "FAILED", error: `sms gateway ${res.status} ${res.statusText}` };
    }
    return { status: "SENT", recipientCount: 1 };
  } catch (err: any) {
    return { status: "FAILED", error: `sms request failed: ${String(err?.message ?? err)}` };
  }
}

export const SmsChannel: NotificationChannel = {
  name: "SMS",
  send,
  retryPolicy: { maxAttempts: 3, baseDelayMs: 1_000, maxDelayMs: 8_000, multiplier: 2 },
};
