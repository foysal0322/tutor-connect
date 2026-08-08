'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseFormData, idSchema } from '@/lib/validation';
import { z } from 'zod';
import { coerceShopSettings, type ShopSettings } from '@/lib/shop/policy';
import { getPlatformSettings } from '@/lib/cache';

/**
 * Boost server action. Sellers pay a flat fee to pin a listing for N days.
 *
 * Money flow (instant settlement — Boost is a service, not escrowed):
 *   1. Validate: seller owns the listing; listing is ACTIVE; not already boosted.
 *   2. Validate: seller.wallet.balance >= boostFeeBdt.
 *   3. Inside $transaction:
 *      - WalletTransaction debit SHOP_BOOST for the seller (negative amount).
 *      - WalletTransaction credit SHOP_BOOST_REVENUE to platform admin wallet.
 *      - ShopBoost row (with paidTxId link).
 *      - ShopListing.boostedUntil = now + boostDays.
 *
 * Commission rate is irrelevant here — Boost is a fixed fee.
 *
 * Phase 12 of NSUONE_SHOP_BLUEPRINT.md.
 */

type Result = { ok: true; endsAt?: string } | { ok: false; error: string };

const schema = z.object({ listingId: idSchema });

async function getShopSettings(): Promise<ShopSettings> {
  const cached = await getPlatformSettings();
  const row = await prisma.platformSetting.findUnique({
    where: { id: 'default' },
  });
  return coerceShopSettings({
    ...cached,
    shopBoostFeeBdt: row?.shopBoostFeeBdt,
    shopBoostDays: row?.shopBoostDays,
    shopCommissionRateDefault: row?.shopCommissionRateDefault,
    shopAutoFinalizeHours: row?.shopAutoFinalizeHours,
    shopDisputeWindowHours: row?.shopDisputeWindowHours,
    shopListingMaxImages: row?.shopListingMaxImages,
    shopModerationMode: row?.shopModerationMode,
    shopMinPriceBdt: row?.shopMinPriceBdt,
    shopMaxPriceBdt: row?.shopMaxPriceBdt,
    shopMaxActiveListingsPerSeller: row?.shopMaxActiveListingsPerSeller,
  });
}

export async function boostListing(formData: FormData): Promise<Result> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { ok: false, error: 'Sign in to boost.' };
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) return { ok: false, error: 'Session missing user id.' };

  const parsed = parseFormData(formData, schema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { listingId } = parsed.data;

  const settings = await getShopSettings();
  if (settings.shopBoostFeeBdt <= 0) {
    return { ok: false, error: 'Boost is currently disabled.' };
  }

  try {
    const endsAt = await prisma.$transaction(async (tx) => {
      const listing = await tx.shopListing.findUnique({
        where: { id: listingId },
        select: {
          id: true,
          sellerId: true,
          status: true,
          boostedUntil: true,
          title: true,
        },
      });
      if (!listing) throw new Error('Listing not found.');
      if (listing.sellerId !== userId) {
        throw new Error('You can only boost your own listings.');
      }
      if (listing.status !== 'ACTIVE') {
        throw new Error('Only active listings can be boosted.');
      }
      // Allow extending an existing boost (additive).
      const now = new Date();
      const baseBoostedUntil = listing.boostedUntil && listing.boostedUntil > now
        ? listing.boostedUntil
        : now;
      const newEndsAt = new Date(
        baseBoostedUntil.getTime() + settings.shopBoostDays * 24 * 3600_000,
      );

      const seller = await tx.user.findUnique({
        where: { id: userId },
        select: { balance: true },
      });
      if (!seller) throw new Error('Account not found.');
      if (seller.balance < settings.shopBoostFeeBdt) {
        throw new Error(
          `Insufficient wallet balance. Boost costs ${settings.shopBoostFeeBdt.toFixed(2)} BDT; your wallet has ${seller.balance.toFixed(2)} BDT.`,
        );
      }

      // Debit seller.
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: settings.shopBoostFeeBdt } },
      });
      const paidTx = await tx.walletTransaction.create({
        data: {
          userId,
          amount: -settings.shopBoostFeeBdt,
          type: 'SHOP_BOOST',
          description: `Boost fee — "${listing.title}" (${settings.shopBoostDays} days)`,
          referenceId: listing.id,
        },
      });

      // Credit platform.
      const platformAdmin = await tx.user.findFirst({
        where: { role: 'ADMIN' },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (platformAdmin) {
        await tx.user.update({
          where: { id: platformAdmin.id },
          data: { balance: { increment: settings.shopBoostFeeBdt } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: platformAdmin.id,
            amount: settings.shopBoostFeeBdt,
            type: 'SHOP_BOOST_REVENUE',
            description: `Boost revenue — listing ${listing.id}`,
            referenceId: listing.id,
          },
        });
      }

      await tx.shopBoost.create({
        data: {
          listingId: listing.id,
          paidTxId: paidTx.id,
          startsAt: now,
          endsAt: newEndsAt,
          feeBdt: settings.shopBoostFeeBdt,
        },
      });
      await tx.shopListing.update({
        where: { id: listing.id },
        data: { boostedUntil: newEndsAt },
      });

      return newEndsAt;
    });

    revalidatePath('/shop/selling');
    revalidatePath(`/shop/listing/${listingId}`);
    revalidatePath('/shop');
    revalidatePath('/wallet');
    return { ok: true, endsAt: endsAt.toISOString() };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Failed.' };
  }
}
