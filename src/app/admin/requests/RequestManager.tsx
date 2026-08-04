'use client';

/**
 * RequestManager — top-level orchestrator for the admin requests page.
 *
 * Phase 6.7: slimmed from a 1012-line monolith into a state owner that
 * delegates rendering to <RequestsTable> (+ its sub-components
 * AssignTutorForm, PaymentVerifyRow, RefundVerifyRow). The bespoke
 * two-step confirm state is gone — each row component owns its own
 * <ConfirmDialog> now.
 *
 * Owns:
 *  - The local request list (mirrors `initialRequests` from the server)
 *  - Search query + status filter (drives the Toolbar)
 *  - loadingId (which row has an in-flight server action)
 *  - refundFeePercent (fetched from /api/settings/fees; used by RefundVerifyRow)
 *  - The action handlers that call server actions + update local state
 *
 * Server action call sites are preserved verbatim (same args, same flows):
 *   verifyPaymentAction(requestId, approve)
 *   verifyRefundAction(refundRequestId, approve, reviewNote?)
 * (assignTutorToRequest is called from AssignTutorForm, unchanged.)
 */

import { useState, useMemo, useEffect } from 'react';
import { verifyPaymentAction, verifyRefundAction } from './actions';
import { useToast } from '@/components/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/Input';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { Select } from '@/components/ui/Select';
import RequestsTable from './RequestsTable';
import { compareRequestPriority, type RequestRow } from './status';

export default function RequestManager({
  initialRequests,
  tutors,
}: {
  initialRequests: RequestRow[];
  tutors: any[];
}) {
  const [requests, setRequests] = useState<RequestRow[]>(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Config-driven platform fee (admin-set via /admin/settings). Falls back
  // to 5% on first paint or if the fetch fails. Used by RefundVerifyRow for
  // the "platform keeps" display.
  const [refundFeePercent, setRefundFeePercent] = useState(5);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/fees')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.withdrawalFeePercent === 'number') {
          setRefundFeePercent(data.withdrawalFeePercent);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const { toast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Mirror server props on revalidation.
  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (statusFilter) {
      if (statusFilter === 'REFUND_REQUESTED') {
        result = result.filter((req) => req.refundRequests && req.refundRequests.length > 0);
      } else {
        result = result.filter((req) => req.status === statusFilter);
      }
    }

    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (req) =>
          req.course.name.toLowerCase().includes(q) ||
          req.student.name.toLowerCase().includes(q) ||
          req.topic?.toLowerCase().includes(q),
      );
    }

    result.sort(compareRequestPriority);
    return result;
  }, [requests, debouncedSearch, statusFilter]);

  // ── Action handlers (call sites preserved from the monolith) ──────────
  const handleApprovePayment = async (requestId: string) => {
    setLoadingId(requestId);
    setGlobalError(null);
    try {
      const res = await verifyPaymentAction(requestId, true);
      if (res?.error) {
        setGlobalError(`Payment verification failed: ${res.error}`);
        toast.error(res.error);
      } else {
        toast.success('Payment approved — session is now active.');
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, status: 'ACCEPTED', payment: r.payment }
              : r,
          ),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to verify payment.';
      setGlobalError(msg);
      toast.error(msg);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRejectPayment = async (requestId: string) => {
    setLoadingId(requestId);
    setGlobalError(null);
    try {
      const res = await verifyPaymentAction(requestId, false);
      if (res?.error) {
        setGlobalError(`Payment verification failed: ${res.error}`);
        toast.error(res.error);
      } else {
        toast.success('Payment rejected.');
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'MATCHED', payment: null } : r)),
        );
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Failed to verify payment.';
      setGlobalError(msg);
      toast.error(msg);
    } finally {
      setLoadingId(null);
    }
  };

  const handleApproveRefund = async (
    refundRequestId: string,
    requestId: string,
    reviewNote?: string,
  ) => {
    setLoadingId(refundRequestId);
    const res = await verifyRefundAction(refundRequestId, true, reviewNote);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Refund approved — session fee credited to wallet.');
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            status: 'CANCELLED',
            refundRequests: r.refundRequests.map((ref) =>
              ref.id === refundRequestId
                ? {
                    ...ref,
                    status: 'APPROVED',
                    reviewNote: reviewNote ?? null,
                    amount: r.budget,
                    resolvedAt: new Date().toISOString(),
                  }
                : ref,
            ),
          };
        }),
      );
    }
    setLoadingId(null);
  };

  const handleRejectRefund = async (
    refundRequestId: string,
    requestId: string,
    reviewNote?: string,
  ) => {
    setLoadingId(refundRequestId);
    const res = await verifyRefundAction(refundRequestId, false, reviewNote);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Refund rejected.');
      setRequests((prev) =>
        prev.map((r) => {
          if (r.id !== requestId) return r;
          return {
            ...r,
            refundRequests: r.refundRequests.map((ref) =>
              ref.id === refundRequestId
                ? {
                    ...ref,
                    status: 'REJECTED',
                    reviewNote: reviewNote ?? null,
                    resolvedAt: new Date().toISOString(),
                  }
                : ref,
            ),
          };
        }),
      );
    }
    setLoadingId(null);
  };

  return (
    <div className='card p-0 overflow-hidden'>
      {globalError && (
        <ErrorAlert
          type='error'
          title='Operation Failed'
          message={globalError}
          onDismiss={() => setGlobalError(null)}
          actions={
            <button
              onClick={() => setGlobalError(null)}
              className='btn-secondary'
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Dismiss
            </button>
          }
        />
      )}

      {/* Toolbar */}
      <div className='flex flex-col sm:flex-row gap-4 p-4 border-b border-color bg-gray-50/50'>
        <div className='flex-1'>
          <Input
            name='search'
            type='text'
            label='Search by course, student, or topic...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className='w-full sm:w-64'>
          <Select
            label='Filter by status'
            hideLabel
            value={statusFilter}
            onChange={setStatusFilter}
            placeholderOption='All Statuses'
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'MATCHED', label: 'Matched' },
              { value: 'PAYMENT_PENDING', label: 'Payment Verifying' },
              { value: 'ACCEPTED', label: 'Active Session' },
              { value: 'COMPLETED', label: 'Completed' },
              { value: 'REFUND_REQUESTED', label: 'Refund Requested' },
              { value: 'CANCELLED', label: 'Cancelled' },
            ]}
          />
        </div>
      </div>

      <RequestsTable
        requests={filteredRequests}
        tutors={tutors}
        refundFeePercent={refundFeePercent}
        loadingId={loadingId}
        onApprovePayment={handleApprovePayment}
        onRejectPayment={handleRejectPayment}
        onApproveRefund={handleApproveRefund}
        onRejectRefund={handleRejectRefund}
      />
    </div>
  );
}
