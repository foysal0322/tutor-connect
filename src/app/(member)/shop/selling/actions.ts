'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  parseFormData,
  shopListingFormSchema,
  shopListingStatusActionSchema,
} from '@/lib/validation';
import {
  canSell,
  coerceShopSettings,
  initialListingStatus,
  validatePrice,
  type ShopSettings,
} from '@/lib/shop/policy';
import { ensureSellerProfile, listMyShopListings } from '@/lib/shop/queries';
import { getPlatformSettings } from '@/lib/cache';

/**
 * Seller server actions. All re-verify auth + eligibility inside the body
 * (the action is the security boundary — UI gating is convenience only).
 *
 * Idempotency: createListing is non-idempotent by design (each call creates
 * a new row). Status actions are safe to retry — terminal state validation
 * guards against double-deletes.
 */

type ActionResult =
  | { ok: true; listingId?: string }
  | { ok: false; error: string };

async function getShopSettings(): Promise<ShopSettings> {
  const raw = await getPlatformSettings();
  // The cached getter returns a subset; pull the shop fields off the row
  // directly so we always see admin-configured values.
  const row = await prisma.platformSetting.findUnique({
    where: { id: 'default' },
  });
  return coerceShopSettings({
    ...raw,
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

async function getCurrentSellerContext(userId: string) {
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBlocked: true, emailVerified: true },
    }),
    ensureSellerProfile(userId),
  ]);
  if (!user) return null;
  return {
    user,
    profile,
  };
}

/** Create a new listing or update an existing draft/active listing. */
export async function saveListing(formData: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to manage listings.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session is missing user id.' };

  const parsed = parseFormData(formData, shopListingFormSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const data = parsed.data;

  const ctx = await getCurrentSellerContext(userId);
  if (!ctx) return { ok: false, error: 'Account not found.' };

  const settings = await getShopSettings();

  const eligibility = canSell({
    isBlocked: ctx.user.isBlocked,
    emailVerified: ctx.user.emailVerified,
    sellerProfileSuspended: ctx.profile.isSuspended,
  });
  if (!eligibility.ok) return { ok: false, error: eligibility.reason };

  const priceCheck = validatePrice(data.priceBdt, settings);
  if (!priceCheck.ok) return { ok: false, error: priceCheck.reason };

  if (data.imagesJson.length > settings.shopListingMaxImages) {
    return {
      ok: false,
      error: `You can attach at most ${settings.shopListingMaxImages} images.`,
    };
  }

  // Verify the category exists + is active.
  const category = await prisma.shopCategory.findFirst({
    where: { id: data.categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) return { ok: false, error: 'Selected category is unavailable.' };

  // If editing, verify ownership + editability.
  if (data.listingId) {
    const existing = await prisma.shopListing.findUnique({
      where: { id: data.listingId },
      select: { id: true, sellerId: true, status: true },
    });
    if (!existing) return { ok: false, error: 'Listing not found.' };
    if (existing.sellerId !== userId) {
      return { ok: false, error: 'You can only edit your own listings.' };
    }
    const editableStatuses = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED'];
    if (!editableStatuses.includes(existing.status)) {
      return { ok: false, error: 'This listing can no longer be edited.' };
    }

    await prisma.shopListing.update({
      where: { id: existing.id },
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        condition: data.condition,
        priceBdt: data.priceBdt,
        quantity: data.quantity,
        location: data.location || null,
        images: data.imagesJson,
        // A re-save on a previously-rejected listing bumps it back to
        // ACTIVE/AUTO (or PENDING_REVIEW/MANUAL) for re-review.
        status:
          existing.status === 'PENDING_REVIEW'
            ? initialListingStatus(settings.shopModerationMode)
            : existing.status,
      },
    });

    revalidatePath('/shop/selling');
    revalidatePath(`/shop/listing/${existing.id}`);
    revalidatePath('/shop');
    return { ok: true, listingId: existing.id };
  }

  // Creating new — enforce the per-seller active-listing cap.
  if (settings.shopMaxActiveListingsPerSeller > 0) {
    const active = await listMyShopListings(userId, [
      'DRAFT',
      'PENDING_REVIEW',
      'ACTIVE',
      'PAUSED',
    ]);
    if (active.length >= settings.shopMaxActiveListingsPerSeller) {
      return {
        ok: false,
        error: `You've reached the limit of ${settings.shopMaxActiveListingsPerSeller} active listings.`,
      };
    }
  }

  const created = await prisma.shopListing.create({
    data: {
      sellerId: userId,
      categoryId: data.categoryId,
      title: data.title,
      description: data.description,
      condition: data.condition,
      priceBdt: data.priceBdt,
      quantity: data.quantity,
      location: data.location || null,
      images: data.imagesJson,
      status: initialListingStatus(settings.shopModerationMode),
    },
    select: { id: true },
  });

  // Keep the seller profile's denormalised listingCount honest.
  await prisma.shopSellerProfile.update({
    where: { userId },
    data: { listingCount: { increment: 1 } },
  });

  revalidatePath('/shop/selling');
  revalidatePath('/shop');
  return { ok: true, listingId: created.id };
}

/** Pause / resume / soft-delete a listing. */
export async function updateListingStatus(
  formData: FormData,
): Promise<ActionResult> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to manage listings.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session is missing user id.' };

  const parsed = parseFormData(formData, shopListingStatusActionSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { listingId, action } = parsed.data;

  const listing = await prisma.shopListing.findUnique({
    where: { id: listingId },
    select: { id: true, sellerId: true, status: true },
  });
  if (!listing) return { ok: false, error: 'Listing not found.' };
  if (listing.sellerId !== userId) {
    return { ok: false, error: 'You can only manage your own listings.' };
  }

  switch (action) {
    case 'pause': {
      if (listing.status !== 'ACTIVE') {
        return { ok: false, error: 'Only active listings can be paused.' };
      }
      await prisma.shopListing.update({
        where: { id: listing.id },
        data: { status: 'PAUSED' },
      });
      break;
    }
    case 'resume': {
      if (listing.status !== 'PAUSED') {
        return { ok: false, error: 'Only paused listings can be resumed.' };
      }
      await prisma.shopListing.update({
        where: { id: listing.id },
        data: { status: 'ACTIVE' },
      });
      break;
    }
    case 'delete': {
      const deletable = ['DRAFT', 'ACTIVE', 'PAUSED', 'PENDING_REVIEW'];
      if (!deletable.includes(listing.status)) {
        return {
          ok: false,
          error: 'This listing can no longer be deleted (it may have sales).',
        };
      }
      await prisma.shopListing.delete({ where: { id: listing.id } });
      await prisma.shopSellerProfile.update({
        where: { userId },
        data: { listingCount: { decrement: 1 } },
      });
      break;
    }
    default:
      return { ok: false, error: 'Unknown action.' };
  }

  revalidatePath('/shop/selling');
  revalidatePath('/shop');
  return { ok: true };
}
