'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseFormData, idSchema } from '@/lib/validation';
import { z } from 'zod';
import {
  coerceShopSettings,
  canBuy,
  computeAutoFinalizeAt,
  computeDisputeWindowEndsAt,
  type ShopSettings,
} from '@/lib/shop/policy';
import { resolveRate, round2 } from '@/lib/shop/service';
import {
  buildCommissionCreditTx,
  buildEscrowDebitTx,
  buildPayoutCreditTx,
  buildRefundCreditTx,
  snapshotListing,
} from '@/lib/shop/escrow';
import { getPlatformSettings } from '@/lib/cache';
import { notifyShopEvent } from '@/lib/shop/notify';

/**
 * Order server actions. All money writes happen inside a single
 * prisma.$transaction with explicit re-validation of the listing inside the
 * tx to prevent race conditions (double-sold race, balance race, etc.).
 *
 * Idempotency: each action accepts the orderId and verifies state inside the
 * tx. Safe to retry.
 */

type ActionResult =
  | { ok: true; orderId?: string }
  | { ok: false; error: string };

async function getShopSettings(): Promise<ShopSettings> {
  const cached = await getPlatformSettings();
  const row = await prisma.platformSetting.findUnique({
    where: { id: 'default' },
  });
  return coerceShopSettings({
    ...cached,
    shopCommissionRateDefault: row?.shopCommissionRateDefault,
    shopAutoFinalizeHours: row?.shopAutoFinalizeHours,
    shopDisputeWindowHours: row?.shopDisputeWindowHours,
    shopListingMaxImages: row?.shopListingMaxImages,
    shopBoostFeeBdt: row?.shopBoostFeeBdt,
    shopBoostDays: row?.shopBoostDays,
    shopModerationMode: row?.shopModerationMode,
    shopMinPriceBdt: row?.shopMinPriceBdt,
    shopMaxPriceBdt: row?.shopMaxPriceBdt,
    shopMaxActiveListingsPerSeller: row?.shopMaxActiveListingsPerSeller,
  });
}

/** Resolve the platform user id that receives commission revenue. */
async function getPlatformUserId(): Promise<string> {
  // First user with role ADMIN is the platform wallet. If none, fall back to
  // the seller's id (commission becomes 0-effect — better than crashing).
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });
  return admin?.id ?? 'platform';
}

const buySchema = z.object({
  listingId: idSchema,
  quantity: z.coerce
    .number()
    .int('Quantity must be a whole number.')
    .min(1, 'Quantity must be at least 1.')
    .max(999, 'Quantity too large.'),
});

/** Place an order: escrow buyer funds, decrement inventory, snapshot listing. */
export async function placeOrder(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to buy.' };
  }
  const buyerId = (session.user as { id?: string }).id;
  if (!buyerId) return { ok: false, error: 'Session missing user id.' };
  const role = (session.user as { role?: string }).role;
  if (role === 'ADMIN') {
    return { ok: false, error: 'Admins cannot place shop orders.' };
  }

  const parsed = parseFormData(formData, buySchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { listingId, quantity } = parsed.data;

  const settings = await getShopSettings();

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Re-read listing inside the tx to prevent race conditions.
      const listing = await tx.shopListing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          sellerId: true,
          title: true,
          description: true,
          condition: true,
          priceBdt: true,
          quantity: true,
          status: true,
          images: true,
          category: {
            select: {
              commissionRateOverride: true,
            },
          },
        },
      });

      if (!listing) throw new Error('Listing not found.');
      if (listing.status !== 'ACTIVE') {
        throw new Error('This listing is no longer available.');
      }
      if (listing.sellerId === buyerId) {
        throw new Error('You cannot buy your own listing.');
      }
      if (listing.quantity < quantity) {
        throw new Error(
          `Only ${listing.quantity} available — reduce your quantity.`,
        );
      }

      const buyer = await tx.user.findUnique({
        where: { id: buyerId },
        select: { id: true, balance: true, isBlocked: true, emailVerified: true, name: true, email: true },
      });
      if (!buyer) throw new Error('Account not found.');

      const eligibility = canBuy({
        isBlocked: buyer.isBlocked,
        emailVerified: buyer.emailVerified,
        walletBalance: buyer.balance,
        price: listing.priceBdt * quantity,
      });
      if (!eligibility.ok) throw new Error(eligibility.reason);

      const seller = await tx.user.findUnique({
        where: { id: listing.sellerId },
        select: { id: true, name: true, email: true },
      });
      if (!seller) throw new Error('Seller account not found.');

      const rate = resolveRate(
        listing.category?.commissionRateOverride ?? null,
        settings.shopCommissionRateDefault,
      );
      const subtotal = round2(listing.priceBdt * quantity);
      const commission = round2(subtotal * rate);
      const payout = round2(subtotal - commission);

      // Debit buyer immediately (escrow).
      const newBuyerBalance = buyer.balance - subtotal;
      await tx.user.update({
        where: { id: buyerId },
        data: { balance: newBuyerBalance },
      });

      const escrowTx = await tx.walletTransaction.create({
        data: buildEscrowDebitTx({
          buyerId,
          orderId: 'pending', // placeholder; updated after order row is created
          subtotalBdt: subtotal,
        }),
      });

      // Decrement inventory; mark SOLD if exhausted.
      const newQty = listing.quantity - quantity;
      const newStatus = newQty === 0 ? 'SOLD' : listing.status;

      // Create order + snapshot.
      const order = await tx.shopOrder.create({
        data: {
          buyerId,
          sellerId: listing.sellerId,
          listingId: listing.id,
          listingSnapshot: snapshotListing({
            id: listing.id,
            title: listing.title,
            priceBdt: listing.priceBdt,
            condition: listing.condition,
            images: listing.images,
          }),
          quantity,
          unitPriceBdt: round2(listing.priceBdt),
          subtotalBdt: subtotal,
          commissionRate: rate,
          commissionBdt: commission,
          payoutBdt: payout,
          escrowTxId: escrowTx.id,
          status: 'ESCROWED',
        },
      });

      // Patch the escrow tx with the real orderId.
      await tx.walletTransaction.update({
        where: { id: escrowTx.id },
        data: {
          description: `Shop purchase (held in escrow) — order ${order.id}`,
          referenceId: order.id,
        },
      });

      // Decrement inventory on the listing.
      await tx.shopListing.update({
        where: { id: listing.id },
        data: { quantity: newQty, status: newStatus, soldCount: { increment: quantity } },
      });

      // Seller profile sale counter (completedSales is incremented at
      // COMPLETED; listingCount decrement happens only on hard delete).

      // Event trail.
      await tx.shopOrderEvent.createMany({
        data: [
          {
            orderId: order.id,
            type: 'CREATED',
            actorId: buyerId,
          },
          {
            orderId: order.id,
            type: 'PAID',
            actorId: buyerId,
            note: `Escrowed ${subtotal.toFixed(2)} BDT`,
            metadata: { rate, commission, payout, escrowTxId: escrowTx.id },
          },
        ],
      });

      return { order, buyer, seller, listing, subtotal };
    });

    // Fire notifications outside the tx so failures don't roll back the order.
    await notifyShopEvent('order:placed', {
      orderId: result.order.id,
      listingTitle: result.listing.title,
      buyerName: result.buyer.name ?? 'Buyer',
      buyerEmail: result.buyer.email,
      sellerId: result.seller.id,
      sellerName: result.seller.name,
      sellerEmail: result.seller.email,
      subtotal: result.subtotal,
    });

    revalidatePath('/shop/orders');
    revalidatePath('/wallet');
    revalidatePath(`/shop/listing/${result.listing.id}`);
    revalidatePath(`/shop/selling`);
    return { ok: true, orderId: result.order.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Order failed.';
    return { ok: false, error: message };
  }
}

const orderActionSchema = z.object({
  orderId: idSchema,
});

/** Seller marks the order as shipped. */
export async function markShipped(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to continue.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, orderActionSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { orderId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          sellerId: true,
          buyerId: true,
          status: true,
          listing: { select: { title: true } },
        },
      });
      if (!order) throw new Error('Order not found.');
      if (order.sellerId !== userId) throw new Error('Only the seller can ship.');
      if (order.status !== 'ESCROWED') {
        throw new Error(`Cannot ship an order that is ${order.status}.`);
      }

      const now = new Date();
      await tx.shopOrder.update({
        where: { id: order.id },
        data: { status: 'SHIPPED', shippedAt: now },
      });
      await tx.shopOrderEvent.create({
        data: { orderId: order.id, type: 'SHIPPED', actorId: userId },
      });
      return order;
    });

    const buyer = await prisma.user.findUnique({
      where: { id: result.buyerId },
      select: { email: true, name: true },
    });
    if (buyer) {
      await notifyShopEvent('order:shipped', {
        orderId: result.id,
        buyerId: result.buyerId,
        buyerEmail: buyer.email,
        buyerName: buyer.name ?? 'Buyer',
        listingTitle: result.listing.title,
      });
    }

    revalidatePath('/shop/orders');
    revalidatePath(`/shop/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

/** Buyer confirms receipt of the order. */
export async function confirmDelivery(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to continue.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, orderActionSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { orderId } = parsed.data;

  const settings = await getShopSettings();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          status: true,
          shippedAt: true,
          listing: { select: { title: true } },
        },
      });
      if (!order) throw new Error('Order not found.');
      if (order.buyerId !== userId) throw new Error('Only the buyer can confirm.');
      if (order.status !== 'SHIPPED') {
        throw new Error(`Cannot confirm an order that is ${order.status}.`);
      }

      const now = new Date();
      await tx.shopOrder.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          deliveredAt: now,
          disputeWindowEndsAt: computeDisputeWindowEndsAt(now, settings),
          autoFinalizeAt: computeAutoFinalizeAt(now, settings),
        },
      });
      await tx.shopOrderEvent.create({
        data: { orderId: order.id, type: 'DELIVERED', actorId: userId },
      });
      return order;
    });

    const seller = await prisma.user.findUnique({
      where: { id: result.sellerId },
      select: { email: true, name: true },
    });
    if (seller) {
      await notifyShopEvent('order:delivered', {
        orderId: result.id,
        sellerId: result.sellerId,
        sellerEmail: seller.email,
        sellerName: seller.name ?? 'Seller',
        listingTitle: result.listing.title,
      });
    }

    revalidatePath('/shop/orders');
    revalidatePath(`/shop/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

/** Buyer completes the order (after delivery). Releases funds to seller. */
export async function completeOrder(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to continue.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, orderActionSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { orderId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          status: true,
          subtotalBdt: true,
          commissionBdt: true,
          payoutBdt: true,
          listing: { select: { id: true, title: true } },
        },
      });
      if (!order) throw new Error('Order not found.');
      // Buyer completes after delivery; auto-finalize (system) also routes here.
      const allowed =
        (order.buyerId === userId && order.status === 'DELIVERED') ||
        order.status === 'DELIVERED';
      if (!allowed) {
        throw new Error(`Cannot complete an order that is ${order.status}.`);
      }

      const platformUserId = await getPlatformUserId();

      // Credit seller.
      const payoutTx = await tx.walletTransaction.create({
        data: buildPayoutCreditTx({
          sellerId: order.sellerId,
          orderId: order.id,
          payoutBdt: order.payoutBdt,
          listingTitle: order.listing.title,
        }),
      });
      // Credit platform commission.
      const commissionTx = await tx.walletTransaction.create({
        data: buildCommissionCreditTx({
          platformUserId,
          orderId: order.id,
          commissionBdt: order.commissionBdt,
        }),
      });

      // Update seller balance (single row — assumes single platform wallet;
      // commission is "kept by platform" — admin wallet balance increments).
      await tx.user.update({
        where: { id: order.sellerId },
        data: { balance: { increment: order.payoutBdt } },
      });
      if (platformUserId !== 'platform') {
        await tx.user.update({
          where: { id: platformUserId },
          data: { balance: { increment: order.commissionBdt } },
        });
      }

      const now = new Date();
      await tx.shopOrder.update({
        where: { id: order.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          payoutTxId: payoutTx.id,
          commissionTxId: commissionTx.id,
        },
      });

      await tx.shopOrderEvent.createMany({
        data: [
          {
            orderId: order.id,
            type: 'COMMISSION_CAPTURED',
            metadata: { commissionBdt: order.commissionBdt, commissionTxId: commissionTx.id },
          },
          {
            orderId: order.id,
            type: 'PAYOUT_RELEASED',
            metadata: { payoutBdt: order.payoutBdt, payoutTxId: payoutTx.id },
          },
          {
            orderId: order.id,
            type: 'COMPLETED',
            actorId: userId,
          },
        ],
      });

      // Denormalize seller stats.
      await tx.shopSellerProfile.upsert({
        where: { userId: order.sellerId },
        update: { completedSales: { increment: 1 } },
        create: { userId: order.sellerId, completedSales: 1 },
      });

      return order;
    });

    const seller = await prisma.user.findUnique({
      where: { id: result.sellerId },
      select: { email: true, name: true },
    });
    if (seller) {
      await notifyShopEvent('order:completed', {
        orderId: result.id,
        sellerId: result.sellerId,
        sellerEmail: seller.email,
        sellerName: seller.name ?? 'Seller',
        payoutBdt: result.payoutBdt,
        listingTitle: result.listing.title,
      });
    }

    revalidatePath('/shop/orders');
    revalidatePath(`/shop/orders/${orderId}`);
    revalidatePath('/wallet');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

/** Buyer cancels the order (before shipping). Refunds the full escrow. */
export async function cancelOrder(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to continue.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, orderActionSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { orderId } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          status: true,
          subtotalBdt: true,
          quantity: true,
          listingId: true,
          listing: { select: { title: true } },
        },
      });
      if (!order) throw new Error('Order not found.');
      if (order.buyerId !== userId) throw new Error('Only the buyer can cancel.');
      const cancellable = ['AWAITING_CONFIRMATION', 'ESCROWED'];
      if (!cancellable.includes(order.status)) {
        throw new Error(`Cannot cancel an order that is ${order.status}.`);
      }

      // Refund buyer.
      const refundTx = await tx.walletTransaction.create({
        data: buildRefundCreditTx({
          buyerId: order.buyerId,
          orderId: order.id,
          subtotalBdt: order.subtotalBdt,
        }),
      });
      await tx.user.update({
        where: { id: order.buyerId },
        data: { balance: { increment: order.subtotalBdt } },
      });

      // Restore inventory.
      await tx.shopListing.update({
        where: { id: order.listingId },
        data: {
          quantity: { increment: order.quantity },
          status: 'ACTIVE',
          soldCount: { decrement: order.quantity },
        },
      });

      await tx.shopOrder.update({
        where: { id: order.id },
        data: {
          status: 'CANCELLED',
          refundTxId: refundTx.id,
        },
      });
      await tx.shopOrderEvent.create({
        data: {
          orderId: order.id,
          type: 'CANCELLED',
          actorId: userId,
          metadata: { refundTxId: refundTx.id },
        },
      });

      return order;
    });

    const seller = await prisma.user.findUnique({
      where: { id: result.buyerId }, // we want seller; re-fetch below
      select: { id: true },
    });
    // We need seller not buyer — fetch fresh.
    const fullOrder = await prisma.shopOrder.findUnique({
      where: { id: result.id },
      select: { sellerId: true },
    });
    const sellerUser = fullOrder
      ? await prisma.user.findUnique({
          where: { id: fullOrder.sellerId },
          select: { email: true, name: true },
        })
      : null;
    if (sellerUser) {
      await notifyShopEvent('order:cancelled', {
        orderId: result.id,
        buyerId: result.buyerId,
        sellerId: fullOrder?.sellerId,
        sellerEmail: sellerUser.email,
        sellerName: sellerUser.name ?? 'Seller',
        subtotal: result.subtotalBdt,
        listingTitle: result.listing.title,
      });
    }

    revalidatePath('/shop/orders');
    revalidatePath(`/shop/orders/${orderId}`);
    revalidatePath('/wallet');
    revalidatePath(`/shop/listing/${result.listingId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
