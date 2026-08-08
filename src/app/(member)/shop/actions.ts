'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseFormData, idSchema, nonEmpty } from '@/lib/validation';
import { z } from 'zod';
import { notifyShopEvent } from '@/lib/shop/notify';

/**
 * Cross-cutting shop actions: save/unsave listings, leave reviews, report
 * listings. Owned here (not under /selling or /orders) because they don't
 * fit either of those domains cleanly.
 */

type ActionResult = { ok: true } | { ok: false; error: string };

const listingIdSchema = z.object({ listingId: idSchema });

/** Save a listing for the signed-in user. Idempotent. */
export async function saveListingAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to save listings.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, listingIdSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await prisma.$transaction(async (tx) => {
      const listing = await tx.shopListing.findUnique({
        where: { id: parsed.data.listingId },
        select: { id: true, status: true },
      });
      if (!listing) throw new Error('Listing not found.');

      await tx.shopSavedListing.upsert({
        where: {
          userId_listingId: { userId, listingId: listing.id },
        },
        update: {},
        create: { userId, listingId: listing.id },
      });
      await tx.shopListing.update({
        where: { id: listing.id },
        data: { savedCount: { increment: 1 } },
      });
    });
    revalidatePath(`/shop/listing/${parsed.data.listingId}`);
    revalidatePath('/shop/saved');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not save listing.' };
  }
}

/** Remove a saved listing. Idempotent. */
export async function unsaveListingAction(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to manage saved listings.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, listingIdSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.shopSavedListing.deleteMany({
        where: { userId, listingId: parsed.data.listingId },
      });
      if (deleted.count > 0) {
        await tx.shopListing.update({
          where: { id: parsed.data.listingId },
          data: { savedCount: { decrement: deleted.count } },
        });
      }
    });
    revalidatePath(`/shop/listing/${parsed.data.listingId}`);
    revalidatePath('/shop/saved');
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not remove saved listing.' };
  }
}

const reviewSchema = z.object({
  orderId: idSchema,
  rating: z.coerce
    .number()
    .int('Rating must be a whole number.')
    .min(1, 'Rating must be at least 1.')
    .max(5, 'Rating must be at most 5.'),
  body: z.string().trim().max(1000, 'Review is too long.').optional().or(z.literal('')),
});

/** Leave a review from the buyer on a COMPLETED order. */
export async function leaveReview(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to review.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };
  const role = (session.user as { role?: string }).role;
  if (role === 'ADMIN') {
    return { ok: false, error: 'Admins cannot leave shop reviews.' };
  }

  const parsed = parseFormData(formData, reviewSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { orderId, rating, body } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.shopOrder.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          listingId: true,
          status: true,
          listing: { select: { title: true } },
        },
      });
      if (!order) throw new Error('Order not found.');
      if (order.buyerId !== userId) {
        throw new Error('Only the buyer can review this order.');
      }
      if (order.status !== 'COMPLETED') {
        throw new Error('You can only review completed orders.');
      }

      const existing = await tx.shopReview.findUnique({
        where: { orderId: order.id },
        select: { id: true },
      });
      if (existing) throw new Error('You already reviewed this order.');

      const review = await tx.shopReview.create({
        data: {
          orderId: order.id,
          fromUserId: userId,
          toUserId: order.sellerId,
          listingId: order.listingId,
          rating,
          body: body || null,
        },
      });

      // Recompute the seller's running avgRating.
      const agg = await tx.shopReview.aggregate({
        where: { toUserId: order.sellerId },
        _avg: { rating: true },
        _count: { _all: true },
      });
      await tx.shopSellerProfile.update({
        where: { userId: order.sellerId },
        data: {
          avgRating: agg._avg.rating ?? null,
        },
      });

      return { review, sellerId: order.sellerId, listingTitle: order.listing.title };
    });

    await notifyShopEvent('review:received', {
      sellerId: result.sellerId,
      listingTitle: result.listingTitle,
      fromUserName: (session.user as { name?: string | null }).name ?? undefined,
      rating,
    });

    revalidatePath(`/shop/orders/${orderId}`);
    revalidatePath(`/shop/seller/${result.sellerId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}

const reportSchema = z.object({
  listingId: idSchema,
  reason: z.enum(
    [
      'PROHIBITED_ITEM',
      'MISREPRESENTATION',
      'SPAM',
      'FRAUD',
      'OFF_CAMPUS_TRANSACTION_REQUEST',
      'HARASSMENT',
      'OTHER',
    ],
    { message: 'Select a valid reason.' },
  ),
  detail: nonEmpty('Detail', 1000),
});

/** Report a listing. */
export async function reportListing(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to report.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, reportSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { listingId, reason, detail } = parsed.data;

  try {
    const [report, listingTitle] = await Promise.all([
      prisma.shopReport.create({
        data: {
          listingId,
          reporterId: userId,
          reason,
          detail,
        },
        select: { id: true },
      }),
      prisma.shopListing
        .findUnique({ where: { id: listingId }, select: { title: true } })
        .then((l) => l?.title ?? undefined),
    ]);
    await notifyShopEvent('listing:reported', {
      listingTitle,
      reportId: report.id,
    });
    revalidatePath(`/shop/listing/${listingId}`);
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not submit report.' };
  }
}
