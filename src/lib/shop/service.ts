/**
 * Shop domain service — pure functions for commission math, formatting, and
 * derived status checks. No Prisma, no React, no side effects. Safe to unit
 * test in isolation.
 *
 * See NSUONE_SHOP_BLUEPRINT.md §7, §8 for the math contracts.
 */

import type {
  ShopItemCondition,
  ShopListingStatus,
  ShopOrderStatus,
} from './types';

/** Commission rate bounds — see blueprint §3.5, §8.1. */
export const COMMISSION_RATE_MIN = 0;
export const COMMISSION_RATE_MAX = 0.2;

export interface CommissionInput {
  unitPriceBdt: number;
  quantity: number;
  /** Resolved rate (category override ?? global default), 0–0.20. */
  rate: number;
}

export interface CommissionResult {
  unitPriceBdt: number;
  quantity: number;
  subtotalBdt: number;
  commissionRate: number;
  commissionBdt: number;
  payoutBdt: number;
}

/** Round to 2dp using banker's rounding (matches Postgres numeric(10,2)). */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return 0;
  // toFixed does banker-ish rounding on the JS side; parse back to number.
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Clamp a commission rate into the allowed window. */
export function clampCommissionRate(rate: number): number {
  if (!Number.isFinite(rate)) return COMMISSION_RATE_MIN;
  return Math.max(COMMISSION_RATE_MIN, Math.min(COMMISSION_RATE_MAX, rate));
}

/**
 * Compute order money math deterministically. The rate is captured here, at
 * sale time, and stored on the order row — see blueprint §8.1 (rate is
 * snapshotted, never recomputed from settings post-sale).
 */
export function computeCommission(input: CommissionInput): CommissionResult {
  const rate = clampCommissionRate(input.rate);
  const unit = Math.max(0, input.unitPriceBdt);
  const qty = Math.max(1, Math.floor(input.quantity));
  const subtotal = round2(unit * qty);
  const commission = round2(subtotal * rate);
  const payout = round2(subtotal - commission);
  return {
    unitPriceBdt: round2(unit),
    quantity: qty,
    subtotalBdt: subtotal,
    commissionRate: rate,
    commissionBdt: commission,
    payoutBdt: payout,
  };
}

/** Format a BDT amount for display. 7650 → "7,650 BDT" / "৳7,650". */
export function formatBDT(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  return `${round2(amount).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} BDT`;
}

/** Compact BDT for KPI tiles (e.g. "12.4k BDT"). */
export function formatBDTCompact(amount: number): string {
  if (!Number.isFinite(amount)) return '—';
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M BDT`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1)}k BDT`;
  return formatBDT(amount);
}

/** Format a rate (0.07) as a percentage string ("7%"). */
export function formatRate(rate: number): string {
  if (!Number.isFinite(rate)) return '—';
  return `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

/**
 * Resolve the effective commission rate for a listing given the category
 * override (if any) and the global default. The category override wins
 * even if it's 0 — that's how "free-cycle" categories work.
 */
export function resolveRate(
  categoryOverride: number | null | undefined,
  globalDefault: number,
): number {
  if (categoryOverride != null && Number.isFinite(categoryOverride)) {
    return clampCommissionRate(categoryOverride);
  }
  return clampCommissionRate(globalDefault);
}

/** True if the listing can be edited by the seller right now. */
export function isListingEditable(status: ShopListingStatus): boolean {
  return (
    status === 'DRAFT' ||
    status === 'PENDING_REVIEW' ||
    status === 'ACTIVE' ||
    status === 'PAUSED'
  );
}

/** True if the order can be cancelled by the buyer (escrow not yet shipped). */
export function isOrderCancellable(status: ShopOrderStatus): boolean {
  return status === 'AWAITING_CONFIRMATION' || status === 'ESCROWED';
}

/** True if the buyer can open a dispute on this order. */
export function isOrderDisputable(status: ShopOrderStatus): boolean {
  return (
    status === 'SHIPPED' ||
    status === 'DELIVERED' ||
    status === 'COMPLETED'
  );
}

/** Friendly condition label, tolerant of unknown values. */
export function conditionLabel(c: string): string {
  switch (c as ShopItemCondition) {
    case 'NEW':
      return 'New';
    case 'LIKE_NEW':
      return 'Like new';
    case 'GOOD':
      return 'Good';
    case 'FAIR':
      return 'Fair';
    case 'FOR_PARTS':
      return 'For parts';
    default:
      return c;
  }
}

/** Build a search-tokens string for ILIKE filtering (Phase 7 will add full-text). */
export function buildSearchTokens(parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .map((p) => p!.trim().toLowerCase())
    .filter(Boolean)
    .join(' ');
}

/** Truncate text for card previews. */
export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + '…';
}

/**
 * Friendly status label for ShopOrder status badges.
 *
 * Most statuses map cleanly via `replace(/_/g, ' ').toLowerCase()`, but
 * `DISPUTED` → "disputed" reads as jargon to students. This helper swaps
 * it for "issue open". All other statuses pass through the default
 * transformation.
 */
export function orderStatusLabel(status: string): string {
  if (status === 'DISPUTED') return 'issue open';
  return status.replace(/_/g, ' ').toLowerCase();
}

/**
 * Friendly status label for ShopDispute status badges.
 *
 * Maps the internal dispute status values to student-friendly copy.
 * Used on the disputes list + detail pages + admin.
 */
export function disputeStatusLabel(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'open';
    case 'AWAITING_SELLER':
      return 'waiting on seller';
    case 'AWAITING_BUYER':
      return 'waiting on buyer';
    case 'RESOLVED_BUYER':
      return 'resolved · buyer refunded';
    case 'RESOLVED_SELLER':
      return 'resolved · seller paid';
    case 'ESCALATED':
      return 'escalated';
    case 'CLOSED':
      return 'closed';
    default:
      return status.replace(/_/g, ' ').toLowerCase();
  }
}
