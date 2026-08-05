// Discord channel — functional provider for the three ops webhooks.
//
// NOT in the default dispatch channel set for Phase 4. Existing server
// actions call notifyX* helpers directly today; auto-wiring discord into
// dispatch would double-post. Provider becomes the dispatch surface in
// Phases 5-7.

type WebhookName = "NOTIFICATIONS" | "ALERTS" | "REQUESTS";

function resolveUrl(name: WebhookName): string | undefined {
  if (name === "REQUESTS") return process.env.DISCORD_REQUESTS_WEBHOOK;
  if (name === "ALERTS") return process.env.DISCORD_ALERTS_WEBHOOK;
  return process.env.DISCORD_NOTIFICATIONS_WEBHOOK;
}

import type { NotificationChannel, ChannelPayload, ChannelSendOutcome } from "./types";

async function send(payload: ChannelPayload): Promise<ChannelSendOutcome> {
  if (!payload.discord) {
    return { status: "FAILED", error: "discord payload missing on event" };
  }
  const url = resolveUrl(payload.discord.webhook);
  if (!url) {
    // Webhook not configured in this environment — skip silently, matching
    // the existing notifyX* helper behavior (missingWebhookWarning + return).
    return { status: "SENT", recipientCount: 0 };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: payload.discord.content,
        embeds: payload.discord.embeds,
      }),
    });
    if (!res.ok) {
      return { status: "FAILED", error: `discord webhook ${res.status} ${res.statusText}` };
    }
    return { status: "SENT", recipientCount: 1 };
  } catch (err: any) {
    return { status: "FAILED", error: String(err?.message ?? err) };
  }
}

export const DiscordChannel: NotificationChannel = {
  name: "DISCORD",
  send,
  retryPolicy: { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 4_000, multiplier: 2 },
};
