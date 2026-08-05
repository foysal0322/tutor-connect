/**
 * status — shared types + pure helpers for the admin requests page.
 *
 * Extracted from RequestManager.tsx as part of the Phase 6.7 decomposition
 * (ADMIN_DASHBOARD_REDESIGN_PLAN.md). Pure functions only — no React, no
 * side effects. Safe to unit-test in isolation.
 */

export interface RefundRequest {
  id: string;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  amount: number | null;
  reviewNote: string | null;
  createdAt: string;
  resolvedAt?: string | null;
}

export interface RequestRow {
  id: string;
  status: string;
  topic: string;
  preferredMode: string;
  preferredDateTime: string | null;
  budget: number;
  courseId: string;
  createdAt: string;
  student: { id: string; name: string; nsuId: string; email: string };
  course: { name: string };
  assignedTutor: { id: string; name: string; email: string } | null;
  payment: {
    mfsType: string;
    accountNumber: string;
    amount: number;
    transactionId: string;
  } | null;
  refundRequests: RefundRequest[];
}

/** Returns the first PENDING refund on a request, or undefined. */
export function getPendingRefund(req: RequestRow): RefundRequest | undefined {
  return req.refundRequests?.find((r) => r.status === 'PENDING');
}

/** Badge class for the row's status pill. */
export function getStatusBadgeClass(req: RequestRow): string {
  const hasPendingRefund = req.refundRequests?.some((r) => r.status === 'PENDING');
  const hasApprovedRefund = req.refundRequests?.some((r) => r.status === 'APPROVED');
  const hasRejectedRefund = req.refundRequests?.some((r) => r.status === 'REJECTED');

  if (hasPendingRefund) return 'badge-danger';
  if (hasApprovedRefund) return 'badge-secondary';
  if (hasRejectedRefund) return 'badge-warning';

  switch (req.status) {
    case 'PENDING':
      return 'badge-warning';
    case 'MATCHED':
      return 'badge-info';
    case 'PAYMENT_PENDING':
      return 'badge-primary';
    case 'ACCEPTED':
      return 'badge-success';
    case 'COMPLETED':
    case 'CANCELLED':
      return 'badge-secondary';
    default:
      return 'badge-secondary';
  }
}

/** Human-readable status label, including refund-aware variants. */
export function getStatusLabel(req: RequestRow): string {
  const hasPendingRefund = req.refundRequests?.some((r) => r.status === 'PENDING');
  const hasApprovedRefund = req.refundRequests?.some((r) => r.status === 'APPROVED');
  const hasRejectedRefund = req.refundRequests?.some((r) => r.status === 'REJECTED');

  if (hasPendingRefund) return 'Refund Requested';
  if (hasApprovedRefund) return 'Refunded (Cancelled)';
  if (hasRejectedRefund) return 'Active (Refund Rejected)';

  switch (req.status) {
    case 'PENDING':
      return 'Pending';
    case 'MATCHED':
      return 'Matched (Unpaid)';
    case 'PAYMENT_PENDING':
      return 'Payment Verifying';
    case 'ACCEPTED':
      return 'Active Session';
    case 'COMPLETED':
      return 'Completed';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      return req.status;
  }
}

/**
 * Sort comparator: actionable items first.
 *   1. PENDING refunds
 *   2. PAYMENT_PENDING
 *   3. PENDING
 *   4. everything else
 * Ties broken by newest-first createdAt.
 */
export function compareRequestPriority(a: RequestRow, b: RequestRow): number {
  const priority = (req: RequestRow): number => {
    const hasPendingRefund = req.refundRequests?.some((r) => r.status === 'PENDING');
    if (hasPendingRefund) return 1;
    if (req.status === 'PAYMENT_PENDING') return 2;
    if (req.status === 'PENDING') return 3;
    return 4;
  };
  const pA = priority(a);
  const pB = priority(b);
  if (pA !== pB) return pA - pB;
  return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
}
