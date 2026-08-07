/**
 * Shop domain types — string-typed enums mirroring the Prisma schema values.
 *
 * Why string unions instead of TS `enum`: the codebase convention (see
 * prisma/schema.prisma) is to store "enums" as plain string columns with
 * comments listing the allowed values. Mirroring that as a TS union keeps
 * the type layer lossless and avoids a parallel `enum` namespace.
 *
 * See NSUONE_SHOP_BLUEPRINT.md §6 for the canonical definitions.
 */

export type ShopListingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'SOLD'
  | 'EXPIRED'
  | 'REJECTED'
  | 'REMOVED';

export type ShopItemCondition =
  | 'NEW'
  | 'LIKE_NEW'
  | 'GOOD'
  | 'FAIR'
  | 'FOR_PARTS';

export type ShopOrderStatus =
  | 'AWAITING_CONFIRMATION'
  | 'ESCROWED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';

export type ShopOrderEventType =
  | 'CREATED'
  | 'PAID'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_MESSAGE'
  | 'DISPUTE_RESOLVED'
  | 'REFUNDED'
  | 'CANCELLED'
  | 'COMMISSION_CAPTURED'
  | 'PAYOUT_RELEASED';

export type ShopDisputeStatus =
  | 'OPEN'
  | 'AWAITING_SELLER'
  | 'AWAITING_BUYER'
  | 'RESOLVED_BUYER'
  | 'RESOLVED_SELLER'
  | 'ESCALATED'
  | 'CLOSED';

export type ShopReportReason =
  | 'PROHIBITED_ITEM'
  | 'MISREPRESENTATION'
  | 'SPAM'
  | 'FRAUD'
  | 'OFF_CAMPUS_TRANSACTION_REQUEST'
  | 'HARASSMENT'
  | 'OTHER';

export type ShopReportStatus = 'OPEN' | 'ACKNOWLEDGED' | 'ACTIONED' | 'DISMISSED';

export type ShopModerationMode = 'AUTO' | 'MANUAL';

export type ShopImageKind = 'LISTING' | 'PROOF_OF_DELIVERY' | 'DISPUTE_EVIDENCE';

/** Active set used by browse queries. */
export const PUBLIC_LISTING_STATUSES: ShopListingStatus[] = ['ACTIVE'];

/** Statuses that mean the seller can still edit the listing. */
export const EDITABLE_LISTING_STATUSES: ShopListingStatus[] = [
  'DRAFT',
  'PENDING_REVIEW',
  'ACTIVE',
  'PAUSED',
];

/** Statuses that should appear in the seller's "active" tab. */
export const SELLER_ACTIVE_STATUSES: ShopListingStatus[] = [
  'ACTIVE',
  'PAUSED',
  'PENDING_REVIEW',
];

/** Human-readable labels for the condition enum, used in dropdowns + detail views. */
export const CONDITION_LABELS: Record<ShopItemCondition, string> = {
  NEW: 'New',
  LIKE_NEW: 'Like new',
  GOOD: 'Good',
  FAIR: 'Fair',
  FOR_PARTS: 'For parts',
};

/** Tailwind-free tone mapping for condition badges (uses StatusBadge tones). */
export const CONDITION_TONE: Record<
  ShopItemCondition,
  'success' | 'info' | 'neutral' | 'warning' | 'danger'
> = {
  NEW: 'success',
  LIKE_NEW: 'info',
  GOOD: 'neutral',
  FAIR: 'warning',
  FOR_PARTS: 'danger',
};

/** Listing status → StatusBadge tone. */
export const LISTING_STATUS_TONE: Record<
  ShopListingStatus,
  'neutral' | 'success' | 'info' | 'warning' | 'danger'
> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'info',
  ACTIVE: 'success',
  PAUSED: 'warning',
  SOLD: 'neutral',
  EXPIRED: 'neutral',
  REJECTED: 'danger',
  REMOVED: 'danger',
};

/** Order status → StatusBadge tone. */
export const ORDER_STATUS_TONE: Record<
  ShopOrderStatus,
  'neutral' | 'success' | 'info' | 'warning' | 'danger'
> = {
  AWAITING_CONFIRMATION: 'neutral',
  ESCROWED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  DISPUTED: 'warning',
  REFUNDED: 'neutral',
  CANCELLED: 'neutral',
};
