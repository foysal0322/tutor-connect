// Channel registry — see NOTIFICATION_SYSTEM_ARCHITECTURE_BLUEPRINT.md §VIII.
//
// Phase 4 wires four providers (InApp, Push, Email, Discord). Email and
// Discord are functional but excluded from DEFAULT_DISPATCH_CHANNELS so the
// legacy createNotification path stays byte-identical (in-app + push only).
//
// Adding a future channel (SMS, webhook, FCM/APNs) means: implement
// NotificationChannel, register it here, and (optionally) add it to a
// caller's event.channels list. No business-logic touch required.

import { InAppChannel } from "./inApp";
import { PushChannel } from "./push";
import { EmailChannel } from "./email";
import { DiscordChannel } from "./discord";
import type { NotificationChannel, ChannelName } from "./types";

const registry = new Map<ChannelName, NotificationChannel>([
  [InAppChannel.name, InAppChannel],
  [PushChannel.name, PushChannel],
  [EmailChannel.name, EmailChannel],
  [DiscordChannel.name, DiscordChannel],
]);

export function getChannel(name: ChannelName): NotificationChannel | undefined {
  return registry.get(name);
}

export function listChannels(): NotificationChannel[] {
  return Array.from(registry.values());
}

// Channels dispatched when an event does not specify `channels`.
// Currently IN_APP + PUSH — the pre-Phase-4 createNotification surface.
export const DEFAULT_DISPATCH_CHANNELS: ChannelName[] = ["IN_APP", "PUSH"];

export type { NotificationChannel, ChannelName, ChannelPayload, ChannelSendOutcome, RetryPolicy } from "./types";
