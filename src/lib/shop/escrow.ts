/**
 * Shop escrow helpers — pure data builders for wallet ledger rows and
 * order-lifecycle state validation.
 *
 * Design principle: escrow.ts NEVER calls prisma directly. It returns
 * data objects that the server action (Phase 6) writes inside a
 * `prisma.$transaction`. This keeps this file unit-testable and avoids
 * coupling money math to the client.
 *
 * Money flow reference — blueprint §7:
 *   1. Buyer pays → wallet DEBIT (SHOP_ESCROW) for the full subtotal.
 *   2. On COMPLETED → wallet CREDIT (SHOP_PAYOUT) to seller + CREDIT
 *      (SHOP_COMMISSION) to platform. Two rows.
 *   3. On REFUND → wallet CREDIT (SHOP_REFUND) to buyer for the full
 *      subtotal. Commission is captured at settlement only, so refunds
 *      always return 100% to the buyer.
 *
 * WalletTransaction.type strings used here extend the existing enum with
 * new values (additive — see schema.prisma comment on WalletTransaction).
 */

import { computeCommission } from './service';

/** Wallet transaction "type" values used by the Shop. */
export const SHOPL_TX_TYPES = {
  ESCROW: 'SHOP_ESCROW',
  PAYOUT: 'SHOP_PAYOUT',
  COMMISSION: 'SHOP_COMMISSION',
  REFUND: 'SHOP_REFUND',
} as const;

export interface EscrowDebitInput {
  buyerId: string;
  orderId: string;
  subtotalBdt: number;
}

/** Build the WalletTransaction row that debits the buyer at order placement. */
export function buildEscrowDebitTx({
  buyerId,
  orderId,
  subtotalBdt,
}: EscrowDebitInput) {
  return {
    userId: buyerId,
    amount: -Math.abs(subtotalBdt),
    type: SHOPL_TX_TYPES.ESCROW,
    description: `Shop purchase (held in escrow) — order ${orderId}`,
    referenceId: orderId,
  };
}

export interface PayoutCreditInput {
  sellerId: string;
  orderId: string;
  payoutBdt: number;
  listingTitle: string;
}

/** Build the WalletTransaction row that credits the seller on settlement. */
export function buildPayoutCreditTx({
  sellerId,
  orderId,
  payoutBdt,
  listingTitle,
}: PayoutCreditInput) {
  return {
    userId: sellerId,
    amount: Math.abs(payoutBdt),
    type: SHOPL_TX_TYPES.PAYOUT,
    description: `Shop sale — "${listingTitle}" (order ${orderId})`,
    referenceId: orderId,
  };
}

export interface CommissionCreditInput {
  /** User that receives the platform commission. Today: a platform/admin
   * wallet user; configurable via env in Phase 10. */
  platformUserId: string;
  orderId: string;
  commissionBdt: number;
}

/** Build the WalletTransaction row that captures platform commission. */
export function buildCommissionCreditTx({
  platformUserId,
  orderId,
  commissionBdt,
}: CommissionCreditInput) {
  return {
    userId: platformUserId,
    amount: Math.abs(commissionBdt),
    type: SHOPL_TX_TYPES.COMMISSION,
    description: `Shop commission — order ${orderId}`,
    referenceId: orderId,
  };
}

export interface RefundCreditInput {
  buyerId: string;
  orderId: string;
  subtotalBdt: number;
}

/** Build the WalletTransaction row that refunds the buyer (full subtotal). */
export function buildRefundCreditTx({
  buyerId,
  orderId,
  subtotalBdt,
}: RefundCreditInput) {
  return {
    userId: buyerId,
    amount: Math.abs(subtotalBdt),
    type: SHOPL_TX_TYPES.REFUND,
    description: `Shop refund — order ${orderId}`,
    referenceId: orderId,
  };
}

/**
 * Snapshot a listing's salient fields at purchase time so the order row is
 * immutable even if the seller later edits or deletes the listing.
 */
export function snapshotListing(listing: {
  id: string;
  title: string;
  priceBdt: number;
  condition: string;
  images?: unknown;
}) {
  return {
    id: listing.id,
    title: listing.title,
    priceBdt: listing.priceBdt,
    condition: listing.condition,
    images: listing.images ?? [],
  };
}

/** Full money-shape result for a new order. Used by the Phase 6 buy action. */
export function computeOrderMoney(input: {
  unitPriceBdt: number;
  quantity: number;
  rate: number;
}) {
  return computeCommission(input);
}
