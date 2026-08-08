import { describe, it, expect } from 'vitest';
import {
  computeCommission,
  clampCommissionRate,
  round2,
  formatBDT,
  formatBDTCompact,
  formatRate,
  resolveRate,
  isListingEditable,
  isOrderCancellable,
  isOrderDisputable,
  conditionLabel,
  buildSearchTokens,
  truncate,
  COMMISSION_RATE_MIN,
  COMMISSION_RATE_MAX,
} from '../service';

/**
 * Unit tests for the Shop service layer — pure commission math, formatting,
 * and lifecycle helpers.
 *
 * The contracts here are non-negotiable per NSUONE_SHOP_BLUEPRINT.md §8:
 *   - Commission rate is clamped 0–20%
 *   - Subtotal = unit × qty
 *   - Commission = round2(subtotal × rate)
 *   - Payout = round2(subtotal − commission)
 *   - Refunds return 100% (commission captured only at settlement)
 */

describe('round2', () => {
  it('rounds to 2 decimal places using banker-ish rounding', () => {
    expect(round2(123.456)).toBe(123.46);
    expect(round2(123.454)).toBe(123.45);
    expect(round2(0.005)).toBe(0.01); // epsilon-bumped
    expect(round2(123)).toBe(123);
    expect(round2(0)).toBe(0);
  });

  it('returns 0 for non-finite input (NaN, Infinity)', () => {
    expect(round2(Number.NaN)).toBe(0);
    expect(round2(Number.POSITIVE_INFINITY)).toBe(0);
    expect(round2(Number.NEGATIVE_INFINITY)).toBe(0);
  });
});

describe('clampCommissionRate', () => {
  it('clamps to the 0–20% window', () => {
    expect(clampCommissionRate(0.07)).toBe(0.07);
    expect(clampCommissionRate(0)).toBe(0);
    expect(clampCommissionRate(0.2)).toBe(0.2);
    expect(clampCommissionRate(0.25)).toBe(COMMISSION_RATE_MAX); // 0.20
    expect(clampCommissionRate(-0.1)).toBe(COMMISSION_RATE_MIN); // 0
    expect(clampCommissionRate(1)).toBe(0.2);
  });

  it('returns 0 for non-finite input', () => {
    expect(clampCommissionRate(Number.NaN)).toBe(0);
    expect(clampCommissionRate(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it('respects the documented bounds constants', () => {
    expect(COMMISSION_RATE_MIN).toBe(0);
    expect(COMMISSION_RATE_MAX).toBe(0.2);
  });
});

describe('computeCommission', () => {
  it('computes subtotal, commission, payout from rate', () => {
    const result = computeCommission({
      unitPriceBdt: 1000,
      quantity: 2,
      rate: 0.07,
    });
    expect(result.unitPriceBdt).toBe(1000);
    expect(result.quantity).toBe(2);
    expect(result.subtotalBdt).toBe(2000);
    expect(result.commissionRate).toBe(0.07);
    expect(result.commissionBdt).toBe(140);
    expect(result.payoutBdt).toBe(1860);
  });

  it('handles zero-rate (free-cycle category)', () => {
    const result = computeCommission({
      unitPriceBdt: 500,
      quantity: 1,
      rate: 0,
    });
    expect(result.commissionBdt).toBe(0);
    expect(result.payoutBdt).toBe(500);
  });

  it('clamps an out-of-bounds rate', () => {
    const result = computeCommission({
      unitPriceBdt: 1000,
      quantity: 1,
      rate: 0.5, // 50% — clamps to 20%
    });
    expect(result.commissionRate).toBe(0.2);
    expect(result.commissionBdt).toBe(200);
    expect(result.payoutBdt).toBe(800);
  });

  it('floor-clamps quantity to 1 and price to 0', () => {
    const result = computeCommission({
      unitPriceBdt: -50, // negative — clamped to 0
      quantity: -3, // negative — clamped to 1
      rate: 0.07,
    });
    expect(result.unitPriceBdt).toBe(0);
    expect(result.quantity).toBe(1);
    expect(result.subtotalBdt).toBe(0);
    expect(result.commissionBdt).toBe(0);
    expect(result.payoutBdt).toBe(0);
  });

  it('produces deterministic payout + commission = subtotal', () => {
    // The invariant: commission + payout must always equal subtotal.
    const cases = [
      { unitPriceBdt: 333.33, quantity: 3, rate: 0.07 },
      { unitPriceBdt: 99.99, quantity: 7, rate: 0.123 },
      { unitPriceBdt: 1234.56, quantity: 1, rate: 0.2 },
    ];
    for (const c of cases) {
      const r = computeCommission(c);
      expect(round2(r.commissionBdt + r.payoutBdt)).toBe(r.subtotalBdt);
    }
  });

  it('produces a snapshot-able rate (stored on the order, never recomputed)', () => {
    // The returned rate is what gets stored on ShopOrder.commissionRate.
    // It must NOT be recomputed from settings post-sale.
    const r1 = computeCommission({ unitPriceBdt: 100, quantity: 1, rate: 0.15 });
    expect(r1.commissionRate).toBe(0.15);
    // Even if the global rate later changes, the snapshot is fixed.
    const r2 = computeCommission({ unitPriceBdt: 100, quantity: 1, rate: 0.05 });
    expect(r2.commissionRate).toBe(0.05);
    expect(r1.commissionRate).not.toBe(r2.commissionRate);
  });
});

describe('formatBDT', () => {
  it('formats with thousand separators and "BDT" suffix', () => {
    expect(formatBDT(7650)).toBe('7,650 BDT');
    expect(formatBDT(1234567.89)).toBe('1,234,567.89 BDT');
    expect(formatBDT(0)).toBe('0 BDT');
  });

  it('returns a dash for non-finite input', () => {
    expect(formatBDT(Number.NaN)).toBe('—');
    expect(formatBDT(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('formatBDTCompact', () => {
  it('compacts large numbers', () => {
    expect(formatBDTCompact(1_234_567)).toBe('1.2M BDT');
    expect(formatBDTCompact(12_400)).toBe('12.4k BDT');
    expect(formatBDTCompact(500)).toBe('500 BDT');
  });
});

describe('formatRate', () => {
  it('formats a 0–1 rate as a percentage', () => {
    expect(formatRate(0.07)).toBe('7%');
    expect(formatRate(0)).toBe('0%');
    expect(formatRate(0.125)).toBe('12.5%');
    expect(formatRate(1)).toBe('100%');
  });
});

describe('resolveRate', () => {
  it('uses the category override when present (even if 0)', () => {
    expect(resolveRate(0, 0.07)).toBe(0);
    expect(resolveRate(0.15, 0.07)).toBe(0.15);
  });

  it('falls back to the global default when override is null/undefined', () => {
    expect(resolveRate(null, 0.07)).toBe(0.07);
    expect(resolveRate(undefined, 0.07)).toBe(0.07);
  });

  it('clamps an out-of-bounds override', () => {
    expect(resolveRate(0.5, 0.07)).toBe(0.2);
    expect(resolveRate(-0.1, 0.07)).toBe(0);
  });
});

describe('isListingEditable', () => {
  it('returns true for DRAFT, PENDING_REVIEW, ACTIVE, PAUSED', () => {
    expect(isListingEditable('DRAFT')).toBe(true);
    expect(isListingEditable('PENDING_REVIEW')).toBe(true);
    expect(isListingEditable('ACTIVE')).toBe(true);
    expect(isListingEditable('PAUSED')).toBe(true);
  });

  it('returns false for terminal + removed statuses', () => {
    expect(isListingEditable('SOLD')).toBe(false);
    expect(isListingEditable('EXPIRED')).toBe(false);
    expect(isListingEditable('REJECTED')).toBe(false);
    expect(isListingEditable('REMOVED')).toBe(false);
  });
});

describe('isOrderCancellable', () => {
  it('returns true only for AWAITING_CONFIRMATION + ESCROWED', () => {
    expect(isOrderCancellable('AWAITING_CONFIRMATION')).toBe(true);
    expect(isOrderCancellable('ESCROWED')).toBe(true);
    expect(isOrderCancellable('SHIPPED')).toBe(false);
    expect(isOrderCancellable('DELIVERED')).toBe(false);
    expect(isOrderCancellable('COMPLETED')).toBe(false);
    expect(isOrderCancellable('CANCELLED')).toBe(false);
  });
});

describe('isOrderDisputable', () => {
  it('returns true for SHIPPED, DELIVERED, COMPLETED', () => {
    expect(isOrderDisputable('SHIPPED')).toBe(true);
    expect(isOrderDisputable('DELIVERED')).toBe(true);
    expect(isOrderDisputable('COMPLETED')).toBe(true);
  });

  it('returns false for pre-shipment + terminal states', () => {
    expect(isOrderDisputable('ESCROWED')).toBe(false);
    expect(isOrderDisputable('CANCELLED')).toBe(false);
    expect(isOrderDisputable('REFUNDED')).toBe(false);
  });
});

describe('conditionLabel', () => {
  it('returns friendly labels for known conditions', () => {
    expect(conditionLabel('NEW')).toBe('New');
    expect(conditionLabel('LIKE_NEW')).toBe('Like new');
    expect(conditionLabel('GOOD')).toBe('Good');
    expect(conditionLabel('FAIR')).toBe('Fair');
    expect(conditionLabel('FOR_PARTS')).toBe('For parts');
  });

  it('returns the raw value for unknown conditions', () => {
    expect(conditionLabel('MINT')).toBe('MINT');
  });
});

describe('buildSearchTokens', () => {
  it('concatenates trimmed lowercase parts with single spaces', () => {
    expect(buildSearchTokens(['  CSE115  ', 'Textbook', null, 'calculUs'])).toBe(
      'cse115 textbook calculus',
    );
  });

  it('returns empty string for all-empty input', () => {
    expect(buildSearchTokens(['', null, undefined])).toBe('');
  });
});

describe('truncate', () => {
  it('returns the original string if within the limit', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('appends a single ellipsis char when truncating', () => {
    const out = truncate('abcdefghij', 5);
    expect(out.length).toBe(5);
    expect(out.endsWith('…')).toBe(true);
  });
});
