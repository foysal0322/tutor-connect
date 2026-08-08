'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseFormData, idSchema, nonEmpty, reasonSchema } from '@/lib/validation';
import { z } from 'zod';
import { notifyShopEvent } from '@/lib/shop/notify';

/**
 * Dispute server actions. Both buyer and seller can open a dispute within
 * the configured window (or pre-emptively for non-confirmation). Resolution
 * is admin-only.
 */

type ActionResult = { ok: true; disputeId?: string } | { ok: false; error: string };

const openSchema = z.object({
  orderId: idSchema,
  reason: reasonSchema,
});

/** Open a dispute. Caller must be the buyer or seller of the order. */
export async function openDispute(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to open a dispute.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };
  const role = (session.user as { role?: string }).role;
  if (role === 'ADMIN') {
    return { ok: false, error: 'Admins cannot open disputes from this surface.' };
  }

  const parsed = parseFormData(formData, openSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { orderId, reason } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          status: true,
          disputeWindowEndsAt: true,
          autoFinalizeAt: true,
          listing: { select: { id: true, title: true } },
        },
      });
      if (!order) throw new Error('Order not found.');
      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new Error('Only the buyer or seller can dispute this order.');
      }
      // Disputable windows:
      //  - buyer: any time after SHIPPED while disputeWindowEndsAt not passed (or COMPLETED within window)
      //  - seller: SHIPPED/DELIVERED/COMPLETED — broader, captures non-confirmation
      const disputableStatuses = ['SHIPPED', 'DELIVERED', 'COMPLETED', 'DISPUTED'];
      if (!disputableStatuses.includes(order.status)) {
        throw new Error(`Cannot dispute an order that is ${order.status}.`);
      }

      const existing = await tx.shopDispute.findUnique({
        where: { orderId: order.id },
        select: { id: true, status: true },
      });
      if (existing && existing.status !== 'CLOSED') {
        throw new Error('A dispute is already open on this order.');
      }

      const dispute = await tx.shopDispute.create({
        data: {
          orderId: order.id,
          openedById: userId,
          reason,
          status: 'OPEN',
        },
      });

      await tx.shopOrder.update({
        where: { id: order.id },
        data: { status: 'DISPUTED' },
      });

      await tx.shopOrderEvent.create({
        data: {
          orderId: order.id,
          type: 'DISPUTE_OPENED',
          actorId: userId,
          metadata: { disputeId: dispute.id, reason },
        },
      });

      // First message on the thread = the reason itself.
      await tx.shopDisputeMessage.create({
        data: {
          disputeId: dispute.id,
          authorId: userId,
          body: reason,
        },
      });

      return { dispute, order, openerRole: order.buyerId === userId ? 'buyer' : 'seller' };
    });

    await notifyShopEvent('dispute:opened', {
      orderId: result.order.id,
      listingTitle: result.order.listing.title,
      buyerId: result.order.buyerId,
      sellerId: result.order.sellerId,
      reason: result.openerRole,
    });

    revalidatePath(`/shop/orders/${orderId}`);
    revalidatePath(`/shop/disputes/${result.dispute.id}`);
    revalidatePath('/shop/disputes');
    return { ok: true, disputeId: result.dispute.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

const messageSchema = z.object({
  disputeId: idSchema,
  body: nonEmpty('Message', 2000),
});

/** Add a message to a dispute thread. Buyer, seller, or admin (any participant). */
export async function postDisputeMessage(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to post.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, messageSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { disputeId, body } = parsed.data;

  try {
    const dispute = await prisma.shopDispute.findUnique({
      where: { id: disputeId },
      select: {
        id: true,
        status: true,
        orderId: true,
        order: { select: { buyerId: true, sellerId: true } },
      },
    });
    if (!dispute) throw new Error('Dispute not found.');
    const isParticipant =
      dispute.order.buyerId === userId ||
      dispute.order.sellerId === userId ||
      (session.user as { role?: string }).role === 'ADMIN';
    if (!isParticipant) throw new Error('Not authorized to post in this dispute.');
    if (dispute.status === 'CLOSED' || dispute.status === 'RESOLVED_BUYER' || dispute.status === 'RESOLVED_SELLER') {
      throw new Error('This dispute is closed.');
    }

    await prisma.shopDisputeMessage.create({
      data: { disputeId, authorId: userId, body },
    });

    await prisma.shopOrderEvent.create({
      data: {
        orderId: dispute.orderId,
        type: 'DISPUTE_MESSAGE',
        actorId: userId,
        metadata: { disputeId },
      },
    });

    revalidatePath(`/shop/disputes/${disputeId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

// --- Admin moderation actions -------------------------------------------

const resolveSchema = z.object({
  disputeId: idSchema,
  resolution: z.enum(['buyer', 'seller'], {
    message: 'Select a resolution.',
  }),
  note: nonEmpty('Note', 1000),
});

/** Admin resolves a dispute. Refunds buyer or pays seller. */
export async function resolveDispute(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in.' };
  }
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN') return { ok: false, error: 'Admins only.' };
  const adminId = (session.user as { id?: string }).id;
  if (!adminId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, resolveSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { disputeId, resolution, note } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const dispute = await tx.shopDispute.findUnique({
        where: { id: disputeId },
        select: {
          id: true,
          status: true,
          orderId: true,
          order: {
            select: {
              id: true,
              status: true,
              buyerId: true,
              sellerId: true,
              subtotalBdt: true,
              payoutBdt: true,
              commissionBdt: true,
              escrowTxId: true,
              payoutTxId: true,
              commissionTxId: true,
              refundTxId: true,
              listing: { select: { title: true } },
            },
          },
        },
      });
      if (!dispute) throw new Error('Dispute not found.');
      if (dispute.status === 'CLOSED') {
        throw new Error('Dispute is already closed.');
      }
      const order = dispute.order;

      // If the seller has NOT been paid yet (escrow state): simply credit
      // one party the full subtotal. Commission is captured only at
      // settlement, so refund returns 100% to buyer; paying seller pays out
      // (subtotal - commission) and credits platform.
      //
      // If the seller HAS been paid (already COMPLETED before dispute):
      // we cannot claw back a wallet credit cleanly. Admin resolution in
      // that case is "decision only" — the platform records the verdict
      // and the seller is expected to make it right manually. We surface
      // this distinction in the UI.
      const sellerAlreadyPaid = !!order.payoutTxId;

      if (!sellerAlreadyPaid) {
        if (resolution === 'buyer') {
          // Refund buyer full subtotal.
          if (!order.refundTxId) {
            const refundTx = await tx.walletTransaction.create({
              data: {
                userId: order.buyerId,
                amount: order.subtotalBdt,
                type: 'SHOP_REFUND',
                description: `Shop dispute refund — order ${order.id}`,
                referenceId: order.id,
              },
            });
            await tx.user.update({
              where: { id: order.buyerId },
              data: { balance: { increment: order.subtotalBdt } },
            });
            await tx.shopOrder.update({
              where: { id: order.id },
              data: { refundTxId: refundTx.id, status: 'REFUNDED' },
            });
          }
        } else {
          // Pay seller the normal payout + capture commission.
          const platformAdmin = await tx.user.findFirst({
            where: { role: 'ADMIN' },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          const platformId = platformAdmin?.id ?? 'platform';
          const payoutTx = await tx.walletTransaction.create({
            data: {
              userId: order.sellerId,
              amount: order.payoutBdt,
              type: 'SHOP_PAYOUT',
              description: `Shop payout (dispute resolved) — order ${order.id}`,
              referenceId: order.id,
            },
          });
          const commissionTx = await tx.walletTransaction.create({
            data: {
              userId: platformId,
              amount: order.commissionBdt,
              type: 'SHOP_COMMISSION',
              description: `Shop commission (dispute resolved) — order ${order.id}`,
              referenceId: order.id,
            },
          });
          await tx.user.update({
            where: { id: order.sellerId },
            data: { balance: { increment: order.payoutBdt } },
          });
          if (platformId !== 'platform') {
            await tx.user.update({
              where: { id: platformId },
              data: { balance: { increment: order.commissionBdt } },
            });
          }
          await tx.shopOrder.update({
            where: { id: order.id },
            data: {
              payoutTxId: payoutTx.id,
              commissionTxId: commissionTx.id,
              status: 'COMPLETED',
              completedAt: new Date(),
            },
          });
          await tx.shopSellerProfile.upsert({
            where: { userId: order.sellerId },
            update: { completedSales: { increment: 1 } },
            create: { userId: order.sellerId, completedSales: 1 },
          });
        }
      }

      const finalStatus = resolution === 'buyer' ? 'RESOLVED_BUYER' : 'RESOLVED_SELLER';
      await tx.shopDispute.update({
        where: { id: dispute.id },
        data: {
          status: finalStatus,
          resolution: note,
          resolvedById: adminId,
          resolvedAt: new Date(),
        },
      });

      await tx.shopOrderEvent.create({
        data: {
          orderId: order.id,
          type: 'DISPUTE_RESOLVED',
          actorId: adminId,
          note: `${finalStatus.replace('RESOLVED_', 'Resolved for ')} — ${note}`,
        },
      });

      return { dispute, order, resolution, sellerAlreadyPaid };
    });

    await notifyShopEvent('dispute:resolved', {
      orderId: result.order.id,
      listingTitle: result.order.listing.title,
      buyerId: result.order.buyerId,
      sellerId: result.order.sellerId,
    });

    revalidatePath(`/admin/shop/disputes`);
    revalidatePath(`/shop/disputes/${disputeId}`);
    revalidatePath(`/shop/orders/${result.order.id}`);
    revalidatePath('/shop/disputes');
    revalidatePath('/wallet');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

const reportHandleSchema = z.object({
  reportId: idSchema,
  action: z.enum(['dismiss', 'takedown'], { message: 'Select an action.' }),
  note: z.string().trim().max(1000, 'Note too long.').optional().or(z.literal('')),
});

/** Admin handles a listing report. */
export async function handleReport(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { ok: false, error: 'Sign in.' };
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN') return { ok: false, error: 'Admins only.' };
  const adminId = (session.user as { id?: string }).id;
  if (!adminId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, reportHandleSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { reportId, action, note } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const report = await tx.shopReport.findUnique({
        where: { id: reportId },
        select: { id: true, listingId: true, listing: { select: { id: true, title: true, sellerId: true } } },
      });
      if (!report) throw new Error('Report not found.');

      const newStatus = action === 'takedown' ? 'ACTIONED' : 'DISMISSED';
      await tx.shopReport.update({
        where: { id: report.id },
        data: { status: newStatus, handledById: adminId, resolution: note || null },
      });

      if (action === 'takedown' && report.listing) {
        await tx.shopListing.update({
          where: { id: report.listing.id },
          data: { status: 'REMOVED' },
        });
      }

      return report;
    });

    if (result.listingId) {
      revalidatePath(`/shop/listing/${result.listingId}`);
    }
    revalidatePath('/admin/shop/reports');
    revalidatePath('/admin/shop/disputes');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

const listingModerationSchema = z.object({
  listingId: idSchema,
  action: z.enum(['approve', 'reject', 'takedown', 'restore'], {
    message: 'Select an action.',
  }),
});

/** Admin acts on a listing directly (not via report). */
export async function moderateListing(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { ok: false, error: 'Sign in.' };
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN') return { ok: false, error: 'Admins only.' };

  const parsed = parseFormData(formData, listingModerationSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { listingId, action } = parsed.data;

  try {
    const listing = await prisma.shopListing.findUnique({
      where: { id: listingId },
      select: { id: true, status: true, sellerId: true, title: true },
    });
    if (!listing) throw new Error('Listing not found.');

    const newStatus =
      action === 'approve'
        ? 'ACTIVE'
        : action === 'reject'
          ? 'REJECTED'
          : action === 'restore'
            ? 'ACTIVE'
            : 'REMOVED';

    await prisma.shopListing.update({
      where: { id: listing.id },
      data: { status: newStatus },
    });

    const event =
      action === 'approve' || action === 'restore'
        ? 'listing:approved'
        : 'listing:rejected';
    await notifyShopEvent(event, {
      sellerId: listing.sellerId,
      listingTitle: listing.title,
    });

    revalidatePath(`/shop/listing/${listing.id}`);
    revalidatePath('/shop/selling');
    revalidatePath('/admin/shop/listings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

const sellerSuspendSchema = z.object({
  userId: idSchema,
  suspend: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

/** Admin suspends or restores a seller. */
export async function setSellerSuspension(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) return { ok: false, error: 'Sign in.' };
  const role = (session.user as { role?: string }).role;
  if (role !== 'ADMIN') return { ok: false, error: 'Admins only.' };

  const parsed = parseFormData(formData, sellerSuspendSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { userId, suspend } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.shopSellerProfile.upsert({
        where: { userId },
        update: { isSuspended: suspend },
        create: { userId, isSuspended: suspend },
      });
      if (suspend) {
        // Pause all active listings; in-flight orders continue normally.
        await tx.shopListing.updateMany({
          where: { sellerId: userId, status: 'ACTIVE' },
          data: { status: 'PAUSED' },
        });
      }
    });

    revalidatePath('/admin/shop/sellers');
    revalidatePath('/shop/selling');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
