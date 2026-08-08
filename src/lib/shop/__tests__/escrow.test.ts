import { describe, it, expect } from 'vitest';
import {
  buildEscrowDebitTx,
  buildPayoutCreditTx,
  buildCommissionCreditTx,
  buildRefundCreditTx,
  snapshotListing,
  computeOrderMoney,
  SHOPL_TX_TYPES,
} from '../escrow';

/**
 * Unit tests for the Shop escrow row builders.
 *
 * These verify the WalletTransaction data shapes that the server actions
 * write inside `prisma.$transaction`. The builders are pure — they never
 * touch Prisma — so these tests prove the money math without a DB.
 *
 * Critical invariants (blueprint §7):
 *   - Escrow debit is NEGATIVE (buyer's balance goes down)
 *   - Payout / commission / refund credits are POSITIVE
 *   - Refund returns the full subtotal (commission captured at settlement)
 *   - Reference ID links every row back to the order
 */

describe('buildEscrowDebitTx', () => {
  it('produces a negative-amount row of type SHOP_ESCROW', () => {
    const tx = buildEscrowDebitTx({
      buyerId: 'user-1',
      orderId: 'order-1',
      subtotalBdt: 1500,
    });
    expect(tx.userId).toBe('user-1');
    expect(tx.amount).toBe(-1500); // negative
    expect(tx.type).toBe(SHOPL_TX_TYPES.ESCROW);
    expect(tx.referenceId).toBe('order-1');
    expect(tx.description).toContain('order-1');
    expect(tx.description.toLowerCase()).toContain('escrow');
  });

  it('forces the amount negative even if subtotal is passed as negative', () => {
    const tx = buildEscrowDebitTx({
      buyerId: 'u',
      orderId: 'o',
      subtotalBdt: -500, // wrong sign defensively
    });
    expect(tx.amount).toBe(-500);
  });
});

describe('buildPayoutCreditTx', () => {
  it('produces a positive-amount row of type SHOP_PAYOUT', () => {
    const tx = buildPayoutCreditTx({
      sellerId: 'seller-1',
      orderId: 'order-1',
      payoutBdt: 1860,
      listingTitle: 'CSE115 textbook',
    });
    expect(tx.userId).toBe('seller-1');
    expect(tx.amount).toBe(1860);
    expect(tx.type).toBe(SHOPL_TX_TYPES.PAYOUT);
    expect(tx.referenceId).toBe('order-1');
    expect(tx.description).toContain('CSE115 textbook');
    expect(tx.description).toContain('order-1');
  });
});

describe('buildCommissionCreditTx', () => {
  it('produces a positive-amount row of type SHOP_COMMISSION', () => {
    const tx = buildCommissionCreditTx({
      platformUserId: 'admin-1',
      orderId: 'order-1',
      commissionBdt: 140,
    });
    expect(tx.userId).toBe('admin-1');
    expect(tx.amount).toBe(140);
    expect(tx.type).toBe(SHOPL_TX_TYPES.COMMISSION);
    expect(tx.referenceId).toBe('order-1');
  });
});

describe('buildRefundCreditTx', () => {
  it('returns the FULL subtotal to the buyer (commission is not clawed back)', () => {
    const tx = buildRefundCreditTx({
      buyerId: 'buyer-1',
      orderId: 'order-1',
      subtotalBdt: 2000,
    });
    expect(tx.amount).toBe(2000); // full subtotal, no commission deduction
    expect(tx.type).toBe(SHOPL_TX_TYPES.REFUND);
    expect(tx.referenceId).toBe('order-1');
  });
});

describe('snapshotListing', () => {
  it('captures the listing fields needed to render an immutable order', () => {
    const snap = snapshotListing({
      id: 'l-1',
      title: 'Scientific calculator',
      priceBdt: 800,
      condition: 'LIKE_NEW',
      images: [{ url: '/x.jpg', sortOrder: 0 }],
    });
    expect(snap).toEqual({
      id: 'l-1',
      title: 'Scientific calculator',
      priceBdt: 800,
      condition: 'LIKE_NEW',
      images: [{ url: '/x.jpg', sortOrder: 0 }],
    });
  });

  it('defaults images to an empty array when not provided', () => {
    const snap = snapshotListing({
      id: 'l-2',
      title: 'No-image item',
      priceBdt: 100,
      condition: 'GOOD',
    });
    expect(snap.images).toEqual([]);
  });
});

describe('computeOrderMoney', () => {
  it('returns the same shape as computeCommission', () => {
    const money = computeOrderMoney({
      unitPriceBdt: 500,
      quantity: 3,
      rate: 0.1,
    });
    expect(money.subtotalBdt).toBe(1500);
    expect(money.commissionBdt).toBe(150);
    expect(money.payoutBdt).toBe(1350);
  });
});

describe('SHOPL_TX_TYPES', () => {
  it('exposes the four canonical wallet-tx types', () => {
    expect(SHOPL_TX_TYPES).toEqual({
      ESCROW: 'SHOP_ESCROW',
      PAYOUT: 'SHOP_PAYOUT',
      COMMISSION: 'SHOP_COMMISSION',
      REFUND: 'SHOP_REFUND',
    });
  });
});
