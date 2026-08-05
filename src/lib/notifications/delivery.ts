// Shared delivery-attempt logic — used by both the inline dispatch path
// (service.ts) and the outbox sweeper (outbox.ts).
//
// Given a NotificationDelivery row and its parent Notification, look up the
// channel, send, and update the row with the outcome. Returns a coarse
// result for the caller's counters. The actual retry backoff scheduling is
// the caller's responsibility (inline path doesn't need to wait; sweeper
// filters via isDue before calling).

import { prisma } from "../prisma";
import { getChannel } from "./channels";
import type { ChannelPayload } from "./channels";
import type { Notification, NotificationDelivery } from "@prisma/client";
import type { NotificationMetadata } from "./types";

export type DeliveryAttemptResult = "sent" | "failed" | "retrying";

export async function attemptDelivery(
  delivery: NotificationDelivery,
  notification: Notification,
  now: Date = new Date(),
): Promise<DeliveryAttemptResult> {
  const channel = getChannel(delivery.channel as any);
  const nextAttempt = delivery.attempts + 1;

  if (!channel) {
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: "FAILED",
        lastError: `unknown channel: ${delivery.channel}`,
        attempts: nextAttempt,
        updatedAt: now,
      },
    });
    return "failed";
  }

  const payload: ChannelPayload = {
    notificationId: notification.id,
    userId: notification.userId,
    title: notification.title,
    message: notification.message,
    actionUrl: notification.actionUrl,
    metadata: (notification.metadata as NotificationMetadata) ?? undefined,
  };

  try {
    const outcome = await channel.send(payload);
    if (outcome.status === "SENT") {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: { status: "SENT", sentAt: now, attempts: nextAttempt, updatedAt: now },
      });
      return "sent";
    }
    if (outcome.status === "EXPIRED") {
      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          status: "EXPIRED",
          attempts: nextAttempt,
          updatedAt: now,
          lastError: outcome.error,
        },
      });
      return "failed";
    }
    // FAILED — schedule retry or give up based on policy.
    const exhausted = nextAttempt >= channel.retryPolicy.maxAttempts;
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "FAILED" : "RETRYING",
        attempts: nextAttempt,
        updatedAt: now,
        lastError: outcome.error,
      },
    });
    return exhausted ? "failed" : "retrying";
  } catch (err: any) {
    const exhausted = nextAttempt >= channel.retryPolicy.maxAttempts;
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: exhausted ? "FAILED" : "RETRYING",
        attempts: nextAttempt,
        updatedAt: now,
        lastError: String(err?.message ?? err),
      },
    });
    return exhausted ? "failed" : "retrying";
  }
}
