import { describe, it, expect } from 'vitest';
import {
  canSell,
  canBuy,
  validatePrice,
  initialListingStatus,
  nextListingStatuses,
  nextOrderStatuses,
  computeAutoFinalizeAt,
  computeDisputeWindowEndsAt,
  coerceShopSettings,
  DEFAULT_SHOP_SETTINGS,
  type ShopSettings,
} from '../policy';

/**
 * Unit tests for the Shop policy layer — eligibility checks, lifecycle
 * transitions, and settings coercion.
 *
 * These cover the regression-critical contracts:
 *   - Blocked/unverified/suspended users cannot sell or buy
 *   - Insufficient wallet balance blocks buying
 *   - Price floor + ceiling are enforced
 *   - State-machine transitions match the blueprint §10, §11
 */

const settings: ShopSettings = { ...DEFAULT_SHOP_SETTINGS };

describe('canSell', () => {
  it('returns ok for a verified, unblocked, unsuspended user', () => {
    expect(
      canSell({
        isBlocked: false,
        emailVerified: new Date(),
        sellerProfileSuspended: false,
      }),
    ).toEqual({ ok: true });
  });

  it('blocks a blocked account', () => {
    const r = canSell({
      isBlocked: true,
      emailVerified: new Date(),
      sellerProfileSuspended: false,
    });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/blocked/i);
  });

  it('blocks an unverified email', () => {
    const r = canSell({
      isBlocked: false,
      emailVerified: null,
      sellerProfileSuspended: false,
    });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/verify/i);
  });

  it('blocks a suspended seller', () => {
    const r = canSell({
      isBlocked: false,
      emailVerified: new Date(),
      sellerProfileSuspended: true,
    });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/suspended/i);
  });
});

describe('canBuy', () => {
  it('returns ok when wallet covers the price', () => {
    expect(
      canBuy({
        isBlocked: false,
        emailVerified: new Date(),
        walletBalance: 1000,
        price: 500,
      }),
    ).toEqual({ ok: true });
  });

  it('blocks when wallet balance is below price', () => {
    const r = canBuy({
      isBlocked: false,
      emailVerified: new Date(),
      walletBalance: 100,
      price: 500,
    });
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/insufficient/i);
  });

  it('accepts exact-balance purchases (>=, not >)', () => {
    expect(
      canBuy({
        isBlocked: false,
        emailVerified: new Date(),
        walletBalance: 500,
        price: 500,
      }),
    ).toEqual({ ok: true });
  });

  it('blocks a blocked or unverified buyer', () => {
    expect(
      canBuy({
        isBlocked: true,
        emailVerified: new Date(),
        walletBalance: 1000,
        price: 500,
      }).ok,
    ).toBe(false);
    expect(
      canBuy({
        isBlocked: false,
        emailVerified: null,
        walletBalance: 1000,
        price: 500,
      }).ok,
    ).toBe(false);
  });
});

describe('validatePrice', () => {
  it('accepts a price within the floor + ceiling', () => {
    expect(validatePrice(500, settings)).toEqual({ ok: true });
    expect(validatePrice(settings.shopMinPriceBdt, settings)).toEqual({ ok: true });
    expect(validatePrice(settings.shopMaxPriceBdt, settings)).toEqual({ ok: true });
  });

  it('rejects zero, negative, and non-finite prices', () => {
    expect(validatePrice(0, settings).ok).toBe(false);
    expect(validatePrice(-10, settings).ok).toBe(false);
    expect(validatePrice(Number.NaN, settings).ok).toBe(false);
  });

  it('rejects below the floor', () => {
    const r = validatePrice(settings.shopMinPriceBdt - 1, settings);
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/minimum/i);
  });

  it('rejects above the ceiling', () => {
    const r = validatePrice(settings.shopMaxPriceBdt + 1, settings);
    expect(r.ok).toBe(false);
    expect((r as { reason: string }).reason).toMatch(/maximum/i);
  });
});

describe('initialListingStatus', () => {
  it('returns ACTIVE for AUTO moderation', () => {
    expect(initialListingStatus('AUTO')).toBe('ACTIVE');
  });

  it('returns PENDING_REVIEW for MANUAL moderation', () => {
    expect(initialListingStatus('MANUAL')).toBe('PENDING_REVIEW');
  });
});

describe('nextListingStatuses', () => {
  it('allows ACTIVE/REJECTED/PAUSED from DRAFT', () => {
    const next = nextListingStatuses('DRAFT');
    expect(next).toContain('ACTIVE');
    expect(next).toContain('REJECTED');
    expect(next).toContain('PAUSED');
  });

  it('allows SOLD/PAUSED/REMOVED/EXPIRED from ACTIVE', () => {
    const next = nextListingStatuses('ACTIVE');
    expect(next).toContain('SOLD');
    expect(next).toContain('PAUSED');
    expect(next).toContain('REMOVED');
    expect(next).toContain('EXPIRED');
  });

  it('allows ACTIVE/REMOVED from PAUSED', () => {
    expect(nextListingStatuses('PAUSED')).toEqual(['ACTIVE', 'REMOVED']);
  });

  it('returns empty for terminal statuses', () => {
    expect(nextListingStatuses('SOLD')).toEqual([]);
    expect(nextListingStatuses('EXPIRED')).toEqual([]);
    expect(nextListingStatuses('REJECTED')).toEqual([]);
    expect(nextListingStatuses('REMOVED')).toEqual([]);
  });
});

describe('nextOrderStatuses', () => {
  it('allows ESCROWED/CANCELLED from AWAITING_CONFIRMATION', () => {
    const next = nextOrderStatuses('AWAITING_CONFIRMATION');
    expect(next).toContain('ESCROWED');
    expect(next).toContain('CANCELLED');
  });

  it('allows SHIPPED/CANCELLED/REFUNDED from ESCROWED', () => {
    const next = nextOrderStatuses('ESCROWED');
    expect(next).toContain('SHIPPED');
    expect(next).toContain('CANCELLED');
    expect(next).toContain('REFUNDED');
  });

  it('allows DELIVERED/DISPUTED/REFUNDED from SHIPPED', () => {
    const next = nextOrderStatuses('SHIPPED');
    expect(next).toContain('DELIVERED');
    expect(next).toContain('DISPUTED');
    expect(next).toContain('REFUNDED');
  });

  it('allows COMPLETED/DISPUTED from DELIVERED', () => {
    const next = nextOrderStatuses('DELIVERED');
    expect(next).toContain('COMPLETED');
    expect(next).toContain('DISPUTED');
  });

  it('allows COMPLETED/REFUNDED from DISPUTED', () => {
    const next = nextOrderStatuses('DISPUTED');
    expect(next).toContain('COMPLETED');
    expect(next).toContain('REFUNDED');
  });

  it('returns empty for terminal statuses', () => {
    expect(nextOrderStatuses('COMPLETED')).toEqual([]);
    expect(nextOrderStatuses('REFUNDED')).toEqual([]);
    expect(nextOrderStatuses('CANCELLED')).toEqual([]);
  });
});

describe('computeAutoFinalizeAt / computeDisputeWindowEndsAt', () => {
  it('adds the configured hours to the delivery time', () => {
    const delivered = new Date('2026-01-01T00:00:00Z');
    const finalize = computeAutoFinalizeAt(delivered, settings);
    const dispute = computeDisputeWindowEndsAt(delivered, settings);
    // 72 hours = 259200000 ms
    expect(finalize.getTime() - delivered.getTime()).toBe(72 * 3600_000);
    // 48 hours = 172800000 ms
    expect(dispute.getTime() - delivered.getTime()).toBe(48 * 3600_000);
    // Dispute window closes before auto-finalize (in this default config)
    expect(dispute.getTime()).toBeLessThan(finalize.getTime());
  });
});

describe('coerceShopSettings', () => {
  it('returns the input values when fully populated', () => {
    const row = {
      shopCommissionRateDefault: 0.1,
      shopAutoFinalizeHours: 100,
      shopDisputeWindowHours: 24,
      shopListingMaxImages: 8,
      shopBoostFeeBdt: 200,
      shopBoostDays: 14,
      shopModerationMode: 'MANUAL',
      shopMinPriceBdt: 50,
      shopMaxPriceBdt: 10000,
      shopMaxActiveListingsPerSeller: 25,
    };
    expect(coerceShopSettings(row)).toEqual(row);
  });

  it('fills in defaults for null/missing fields', () => {
    const out = coerceShopSettings({
      shopCommissionRateDefault: null,
      shopAutoFinalizeHours: null,
      shopDisputeWindowHours: null,
      shopListingMaxImages: null,
      shopBoostFeeBdt: null,
      shopBoostDays: null,
      shopModerationMode: null,
      shopMinPriceBdt: null,
      shopMaxPriceBdt: null,
      shopMaxActiveListingsPerSeller: null,
    });
    expect(out).toEqual(DEFAULT_SHOP_SETTINGS);
  });

  it('normalises an unknown moderation mode to AUTO', () => {
    expect(coerceShopSettings({ shopModerationMode: 'WEIRD' }).shopModerationMode).toBe('AUTO');
    expect(coerceShopSettings({ shopModerationMode: 'MANUAL' }).shopModerationMode).toBe('MANUAL');
    expect(coerceShopSettings({ shopModerationMode: 'AUTO' }).shopModerationMode).toBe('AUTO');
  });
});
