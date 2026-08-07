/**
 * Shop policy — eligibility, lifecycle transitions, and config shape.
 *
 * Pure checks used by server actions BEFORE any Prisma write. Money and
 * ownership are re-verified inside transactions in escrow.ts (defence in
 * depth: never trust a capability check alone for money movement).
 *
 * See NSUONE_SHOP_BLUEPRINT.md §9, §10, §11.
 */

import type { ShopListingStatus, ShopOrderStatus } from './types';

/** Snapshot of the shop-relevant PlatformSetting fields. */
export interface ShopSettings {
  shopCommissionRateDefault: number;
  shopAutoFinalizeHours: number;
  shopDisputeWindowHours: number;
  shopListingMaxImages: number;
  shopBoostFeeBdt: number;
  shopBoostDays: number;
  shopModerationMode: 'AUTO' | 'MANUAL';
  shopMinPriceBdt: number;
  shopMaxPriceBdt: number;
  shopMaxActiveListingsPerSeller: number;
}

/** Safe defaults used when PlatformSetting hasn't been seeded yet. */
export const DEFAULT_SHOP_SETTINGS: ShopSettings = {
  shopCommissionRateDefault: 0.07,
  shopAutoFinalizeHours: 72,
  shopDisputeWindowHours: 48,
  shopListingMaxImages: 6,
  shopBoostFeeBdt: 100,
  shopBoostDays: 7,
  shopModerationMode: 'AUTO',
  shopMinPriceBdt: 20,
  shopMaxPriceBdt: 50000,
  shopMaxActiveListingsPerSeller: 50,
};

/** Map a PlatformSetting row (possibly partial) into a complete ShopSettings. */
export function coerceShopSettings(row: {
  shopCommissionRateDefault?: number | null;
  shopAutoFinalizeHours?: number | null;
  shopDisputeWindowHours?: number | null;
  shopListingMaxImages?: number | null;
  shopBoostFeeBdt?: number | null;
  shopBoostDays?: number | null;
  shopModerationMode?: string | null;
  shopMinPriceBdt?: number | null;
  shopMaxPriceBdt?: number | null;
  shopMaxActiveListingsPerSeller?: number | null;
}): ShopSettings {
  return {
    shopCommissionRateDefault:
      typeof row.shopCommissionRateDefault === 'number'
        ? row.shopCommissionRateDefault
        : DEFAULT_SHOP_SETTINGS.shopCommissionRateDefault,
    shopAutoFinalizeHours:
      typeof row.shopAutoFinalizeHours === 'number'
        ? row.shopAutoFinalizeHours
        : DEFAULT_SHOP_SETTINGS.shopAutoFinalizeHours,
    shopDisputeWindowHours:
      typeof row.shopDisputeWindowHours === 'number'
        ? row.shopDisputeWindowHours
        : DEFAULT_SHOP_SETTINGS.shopDisputeWindowHours,
    shopListingMaxImages:
      typeof row.shopListingMaxImages === 'number'
        ? row.shopListingMaxImages
        : DEFAULT_SHOP_SETTINGS.shopListingMaxImages,
    shopBoostFeeBdt:
      typeof row.shopBoostFeeBdt === 'number'
        ? row.shopBoostFeeBdt
        : DEFAULT_SHOP_SETTINGS.shopBoostFeeBdt,
    shopBoostDays:
      typeof row.shopBoostDays === 'number'
        ? row.shopBoostDays
        : DEFAULT_SHOP_SETTINGS.shopBoostDays,
    shopModerationMode:
      row.shopModerationMode === 'MANUAL' ? 'MANUAL' : 'AUTO',
    shopMinPriceBdt:
      typeof row.shopMinPriceBdt === 'number'
        ? row.shopMinPriceBdt
        : DEFAULT_SHOP_SETTINGS.shopMinPriceBdt,
    shopMaxPriceBdt:
      typeof row.shopMaxPriceBdt === 'number'
        ? row.shopMaxPriceBdt
        : DEFAULT_SHOP_SETTINGS.shopMaxPriceBdt,
    shopMaxActiveListingsPerSeller:
      typeof row.shopMaxActiveListingsPerSeller === 'number'
        ? row.shopMaxActiveListingsPerSeller
        : DEFAULT_SHOP_SETTINGS.shopMaxActiveListingsPerSeller,
  };
}

/** Result of an eligibility check — failures carry a user-safe message. */
export type EligibilityResult =
  | { ok: true }
  | { ok: false; reason: string };

/** Can this user sell on the Shop right now? */
export function canSell(opts: {
  isBlocked: boolean;
  emailVerified: Date | string | null;
  sellerProfileSuspended: boolean;
}): EligibilityResult {
  if (opts.isBlocked) {
    return { ok: false, reason: 'Your account is blocked.' };
  }
  if (!opts.emailVerified) {
    return { ok: false, reason: 'Verify your email before listing items.' };
  }
  if (opts.sellerProfileSuspended) {
    return {
      ok: false,
      reason:
        'Your seller account is suspended. Contact support to resolve.',
    };
  }
  return { ok: true };
}

/** Can this user buy on the Shop right now? */
export function canBuy(opts: {
  isBlocked: boolean;
  emailVerified: Date | string | null;
  walletBalance: number;
  price: number;
}): EligibilityResult {
  if (opts.isBlocked) {
    return { ok: false, reason: 'Your account is blocked.' };
  }
  if (!opts.emailVerified) {
    return { ok: false, reason: 'Verify your email before buying.' };
  }
  if (opts.walletBalance < opts.price) {
    return {
      ok: false,
      reason: `Insufficient wallet balance. Item costs ${opts.price.toFixed(2)} BDT; your wallet has ${opts.walletBalance.toFixed(2)} BDT.`,
    };
  }
  return { ok: true };
}

/** Validate a listing's price against the configured floor + ceiling. */
export function validatePrice(
  price: number,
  settings: ShopSettings,
): EligibilityResult {
  if (!Number.isFinite(price) || price <= 0) {
    return { ok: false, reason: 'Price must be a positive number.' };
  }
  if (price < settings.shopMinPriceBdt) {
    return {
      ok: false,
      reason: `Minimum price is ${settings.shopMinPriceBdt} BDT.`,
    };
  }
  if (price > settings.shopMaxPriceBdt) {
    return {
      ok: false,
      reason: `Maximum price is ${settings.shopMaxPriceBdt} BDT. Contact support for high-value items.`,
    };
  }
  return { ok: true };
}

/** Resolve the initial listing status based on moderation mode. */
export function initialListingStatus(
  moderationMode: 'AUTO' | 'MANUAL',
): ShopListingStatus {
  return moderationMode === 'MANUAL' ? 'PENDING_REVIEW' : 'ACTIVE';
}

/** Allowed transitions from a given listing status. */
export function nextListingStatuses(from: ShopListingStatus): ShopListingStatus[] {
  switch (from) {
    case 'DRAFT':
    case 'PENDING_REVIEW':
      return ['ACTIVE', 'REJECTED', 'PAUSED'];
    case 'ACTIVE':
      return ['PAUSED', 'SOLD', 'EXPIRED', 'REMOVED'];
    case 'PAUSED':
      return ['ACTIVE', 'REMOVED'];
    case 'SOLD':
    case 'EXPIRED':
    case 'REJECTED':
    case 'REMOVED':
      return [];
    default:
      return [];
  }
}

/** Allowed transitions from a given order status. */
export function nextOrderStatuses(from: ShopOrderStatus): ShopOrderStatus[] {
  switch (from) {
    case 'AWAITING_CONFIRMATION':
      return ['ESCROWED', 'CANCELLED'];
    case 'ESCROWED':
      return ['SHIPPED', 'CANCELLED', 'REFUNDED'];
    case 'SHIPPED':
      return ['DELIVERED', 'DISPUTED', 'REFUNDED'];
    case 'DELIVERED':
      return ['COMPLETED', 'DISPUTED'];
    case 'DISPUTED':
      return ['COMPLETED', 'REFUNDED'];
    case 'COMPLETED':
    case 'REFUNDED':
    case 'CANCELLED':
      return [];
    default:
      return [];
  }
}

/** Compute the autoFinalizeAt timestamp for an order at delivery time. */
export function computeAutoFinalizeAt(
  deliveredAt: Date,
  settings: ShopSettings,
): Date {
  return new Date(
    deliveredAt.getTime() + settings.shopAutoFinalizeHours * 3600_000,
  );
}

/** Compute the disputeWindowEndsAt timestamp for an order at delivery time. */
export function computeDisputeWindowEndsAt(
  deliveredAt: Date,
  settings: ShopSettings,
): Date {
  return new Date(
    deliveredAt.getTime() + settings.shopDisputeWindowHours * 3600_000,
  );
}
