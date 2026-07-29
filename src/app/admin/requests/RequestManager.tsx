'use client';

import { useState, useMemo, useEffect } from 'react';
import AssignTutorForm from './AssignTutorForm';
import { verifyPaymentAction, verifyRefundAction } from './actions';
import { useToast } from '@/components/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/Input';
import LoadingButton from '@/components/ui/LoadingButton';
import ErrorAlert from '@/components/ui/ErrorAlert';
import { Select } from '@/components/ui/Select';

// NOTE: This component is a 558-line monolith (FRONTEND_AUDIT.md E1) and its
// table is tightly coupled to in-component state (search, status filter,
// inline assign-tutor dialog, payment/refund verification, per-row toasts).
// Migrating the table to <DataGrid> in isolation would either duplicate state
// or require lifting it out — cleaner to do as part of the E1 decomposition
// (split into RequestTable + RequestFilters + RequestActions). See plan.md
// Step 2 and FRONTEND_AUDIT.md E1.

export default function RequestManager({ initialRequests, tutors }: { initialRequests: any[], tutors: any[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; extra?: any } | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const { toast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Sync state with incoming server props
  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (statusFilter) {
      if (statusFilter === 'REFUND_REQUESTED') {
        result = result.filter(req => req.refundRequests && req.refundRequests.length > 0);
      } else {
        result = result.filter(req => req.status === statusFilter);
      }
    }

    if (debouncedSearch.trim()) {
      const lowerQuery = debouncedSearch.toLowerCase();
      result = result.filter(req => 
        req.course.name.toLowerCase().includes(lowerQuery) ||
        req.student.name.toLowerCase().includes(lowerQuery) ||
        req.topic?.toLowerCase().includes(lowerQuery)
      );
    }

    // Sort: PENDING on top, then PAYMENT_PENDING, then by date descending
    result.sort((a, b) => {
      const getPriority = (status: string, refundRequests: any[]) => {
        const hasPendingRefund = refundRequests && refundRequests.some((r: any) => r.status === 'PENDING');
        if (hasPendingRefund) return 1;
        if (status === 'PAYMENT_PENDING') return 2;
        if (status === 'PENDING') return 3;
        return 4;
      };

      const pA = getPriority(a.status, a.refundRequests);
      const pB = getPriority(b.status, b.refundRequests);

      if (pA !== pB) return pA - pB;

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return result;
  }, [requests, debouncedSearch, statusFilter]);


  const handleVerifyPayment = async (requestId: string, approve: boolean) => {
    setConfirmAction(null);
    setLoadingId(requestId);
    setGlobalError(null);

    try {
      const res = await verifyPaymentAction(requestId, approve);
      if (res?.error) {
        setGlobalError(`Payment verification failed: ${res.error}`);
        toast.error(res.error);
      } else {
        toast.success(approve ? 'Payment approved — session is now active.' : 'Payment rejected.');
        setRequests(prev => prev.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: approve ? 'ACCEPTED' : 'MATCHED',
              payment: approve ? r.payment : null
            };
          }
          return r;
        }));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment. Please try again.';
      setGlobalError(errorMessage);
      toast.error(errorMessage);
      console.error('Payment verification error:', error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleVerifyRefund = async (refundRequestId: string, requestId: string, approve: boolean) => {
    setConfirmAction(null);
    setLoadingId(refundRequestId);
    const res = await verifyRefundAction(refundRequestId, approve);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(approve ? 'Refund approved.' : 'Refund rejected.');
      setRequests(prev => prev.map(r => {
        if (r.id === requestId) {
          return {
            ...r,
            status: approve ? 'CANCELLED' : r.status,
            refundRequests: r.refundRequests.map((ref: any) => 
              ref.id === refundRequestId ? { ...ref, status: approve ? 'APPROVED' : 'REJECTED' } : ref
            )
          };
        }
        return r;
      }));
    }
    setLoadingId(null);
  };

  const getStatusBadgeColors = (req: any) => {
    const hasPendingRefund = req.refundRequests && req.refundRequests.some((r: any) => r.status === 'PENDING');
    const hasApprovedRefund = req.refundRequests && req.refundRequests.some((r: any) => r.status === 'APPROVED');
    const hasRejectedRefund = req.refundRequests && req.refundRequests.some((r: any) => r.status === 'REJECTED');

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
  };

  const getStatusLabel = (req: any) => {
    const hasPendingRefund = req.refundRequests && req.refundRequests.some((r: any) => r.status === 'PENDING');
    const hasApprovedRefund = req.refundRequests && req.refundRequests.some((r: any) => r.status === 'APPROVED');
    const hasRejectedRefund = req.refundRequests && req.refundRequests.some((r: any) => r.status === 'REJECTED');

    if (hasPendingRefund) return 'Refund Requested';
    if (hasApprovedRefund) return 'Refunded (Cancelled)';
    if (hasRejectedRefund) return 'Active (Refund Rejected)';

    switch (req.status) {
      case 'PENDING': return 'Pending';
      case 'MATCHED': return 'Matched (Unpaid)';
      case 'PAYMENT_PENDING': return 'Payment Verifying';
      case 'ACCEPTED': return 'Active Session';
      case 'COMPLETED': return 'Completed';
      case 'CANCELLED': return 'Cancelled';
      default: return req.status;
    }
  };

  return (
    <div className="card p-0 overflow-hidden">
      {/* Global Error Alert */}
      {globalError && (
        <ErrorAlert
          type="error"
          title="Operation Failed"
          message={globalError}
          onDismiss={() => setGlobalError(null)}
          actions={
            <button
              onClick={() => setGlobalError(null)}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}
            >
              Dismiss
            </button>
          }
        />
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-color bg-gray-50/50">
        <div className="flex-1">
          <Input
            name="search"
            type="text"
            label="Search by course, student, or topic..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Select
            label="Filter by status"
            hideLabel
            value={statusFilter}
            onChange={setStatusFilter}
            placeholderOption="All Statuses"
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

      <div className="data-grid-container">
        <table className="data-grid hidden md:table">
          <thead>
            <tr>
              <th>Student</th>
              <th>Course / Details</th>
              <th>Status</th>
              <th>Assigned Tutor</th>
              <th>Payment & Refunds / Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(req => {
                const badgeClass = getStatusBadgeColors(req);
                const badgeLabel = getStatusLabel(req);
                const pendingRefund = req.refundRequests && req.refundRequests.find((r: any) => r.status === 'PENDING');
                
                return (
                  <tr key={req.id}>
                    <td>
                      <div className="font-semibold text-main">{req.student.name}</div>
                      <div className="text-xs text-muted mt-1">ID: {req.student.nsuId}</div>
                      <div className="text-xs text-muted">Email: {req.student.email}</div>
                    </td>
                    <td>
                      <div className="font-semibold text-main">{req.course.name}</div>
                      <div className="text-sm text-muted mt-1">Topic: {req.topic}</div>
                      <div className="text-sm text-muted">Mode: {req.preferredMode}</div>
                      {req.preferredDateTime && (
                        <div className="text-sm text-muted">Time: {new Date(req.preferredDateTime).toLocaleString()}</div>
                      )}
                      <div className="text-sm font-semibold text-primary mt-1">{req.budget} BDT</div>
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        {badgeLabel}
                      </span>
                    </td>
                    <td>
                      {req.assignedTutor ? (
                        <div>
                          <div className="font-semibold text-main">{req.assignedTutor.name}</div>
                          <div className="text-xs text-muted mt-1">Email: {req.assignedTutor.email}</div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted italic">Unassigned</span>
                      )}
                    </td>
                    <td>
                      {/* Action & Info handling */}
                      
                      {/* Case 1: Waiting for tutor assignment */}
                      {req.status === 'PENDING' && (
                        <AssignTutorForm requestId={req.id} courseId={req.courseId} tutors={tutors} />
                      )}

                      {/* Case 2: Payment is pending verification */}
                      {req.status === 'PAYMENT_PENDING' && req.payment && (
                        <div className="bg-primary-light p-3 rounded-md border border-primary text-sm">
                          <div className="mb-1"><strong className="text-primary">MFS Info:</strong> {req.payment.mfsType}</div>
                          <div className="mb-1"><strong className="text-primary">Account:</strong> {req.payment.accountNumber}</div>
                          <div className="mb-1"><strong className="text-primary">Amount:</strong> {req.payment.amount} BDT</div>
                          <div className="mb-3"><strong className="text-primary">Txn ID:</strong> <code className="bg-white px-1.5 py-0.5 rounded shadow-sm text-main">{req.payment.transactionId}</code></div>
                          
                          <div className="flex gap-2 flex-wrap">
                            {confirmAction?.type === `pay-approve-${req.id}` ? (
                              <>
                                <span className="text-success-hover font-semibold self-center mr-2">Approve?</span>
                                <LoadingButton
                                  onClick={() => handleVerifyPayment(req.id, true)}
                                  loading={loadingId === req.id}
                                  loadingText="..."
                                  className="bg-success text-white px-3 py-1 text-xs"
                                  aria-label="Approve payment for {req.course.name} request from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Yes, Approve
                                </LoadingButton>
                                <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel payment approval">Cancel</button>
                              </>
                            ) : confirmAction?.type === `pay-reject-${req.id}` ? (
                              <>
                                <span className="text-danger-hover font-semibold self-center mr-2">Reject?</span>
                                <LoadingButton
                                  onClick={() => handleVerifyPayment(req.id, false)}
                                  loading={loadingId === req.id}
                                  loadingText="..."
                                  className="bg-danger text-white px-3 py-1 text-xs"
                                  aria-label="Reject payment for {req.course.name} request from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Yes, Reject
                                </LoadingButton>
                                <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel payment rejection">Cancel</button>
                              </>
                            ) : (
                              <>
                                <LoadingButton
                                  onClick={() => setConfirmAction({ type: `pay-approve-${req.id}`, id: req.id })}
                                  loading={loadingId === req.id}
                                  className="bg-success text-white px-3 py-1 text-xs"
                                  aria-label="Initiate payment approval for {req.course.name} request from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Approve
                                </LoadingButton>
                                <LoadingButton
                                  onClick={() => setConfirmAction({ type: `pay-reject-${req.id}`, id: req.id })}
                                  loading={loadingId === req.id}
                                  className="bg-danger text-white px-3 py-1 text-xs"
                                  aria-label="Initiate payment rejection for {req.course.name} request from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Reject
                                </LoadingButton>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Case 3: Refund request is pending approval */}
                      {pendingRefund && (
                        <div className="bg-warning-light p-3 rounded-md border border-warning text-sm mt-2">
                          <div className="font-semibold text-warning-hover mb-1">Refund Reason:</div>
                          <div className="italic bg-white p-2 rounded shadow-sm text-main mb-3">"{pendingRefund.details}"</div>
                          
                          <div className="flex gap-2 flex-wrap">
                            {confirmAction?.type === `ref-approve-${pendingRefund.id}` ? (
                              <>
                                <span className="text-success-hover font-semibold self-center mr-2">Approve?</span>
                                <LoadingButton
                                  onClick={() => handleVerifyRefund(pendingRefund.id, req.id, true)}
                                  loading={loadingId === pendingRefund.id}
                                  loadingText="..."
                                  className="bg-success text-white px-3 py-1 text-xs"
                                  aria-label="Approve refund request for {req.course.name} from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Yes, Approve
                                </LoadingButton>
                                <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel refund approval">Cancel</button>
                              </>
                            ) : confirmAction?.type === `ref-reject-${pendingRefund.id}` ? (
                              <>
                                <span className="text-danger-hover font-semibold self-center mr-2">Reject?</span>
                                <LoadingButton
                                  onClick={() => handleVerifyRefund(pendingRefund.id, req.id, false)}
                                  loading={loadingId === pendingRefund.id}
                                  loadingText="..."
                                  className="bg-danger text-white px-3 py-1 text-xs"
                                  aria-label="Reject refund request for {req.course.name} from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Yes, Reject
                                </LoadingButton>
                                <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel refund rejection">Cancel</button>
                              </>
                            ) : (
                              <>
                                <LoadingButton
                                  onClick={() => setConfirmAction({ type: `ref-approve-${pendingRefund.id}`, id: pendingRefund.id })}
                                  loading={loadingId === pendingRefund.id}
                                  className="bg-success text-white px-3 py-1 text-xs"
                                  aria-label="Initiate refund approval for {req.course.name} from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Approve
                                </LoadingButton>
                                <LoadingButton
                                  onClick={() => setConfirmAction({ type: `ref-reject-${pendingRefund.id}`, id: pendingRefund.id })}
                                  loading={loadingId === pendingRefund.id}
                                  className="bg-danger text-white px-3 py-1 text-xs"
                                  aria-label="Initiate refund rejection for {req.course.name} from {req.student.name}"
                                  style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
                                >
                                  Reject
                                </LoadingButton>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fallback label when no actions are available */}
                      {req.status !== 'PENDING' && req.status !== 'PAYMENT_PENDING' && !pendingRefund && (
                        <span className="text-sm text-muted">
                          No pending actions
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-muted">
                  No requests found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50">
          {filteredRequests.length > 0 ? (
            filteredRequests.map(req => {
              const badgeClass = getStatusBadgeColors(req);
              const badgeLabel = getStatusLabel(req);
              const pendingRefund = req.refundRequests && req.refundRequests.find((r: any) => r.status === 'PENDING');
              
              return (
                <div key={req.id} className="card p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start border-b border-color pb-3">
                    <div>
                      <div className="font-semibold text-main text-lg">{req.course.name}</div>
                      <div className="text-sm text-muted">{req.topic}</div>
                    </div>
                    <span className={`badge ${badgeClass}`}>
                      {badgeLabel}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Student</div>
                      <div className="font-medium text-main">{req.student.name}</div>
                      <div className="text-xs text-muted">{req.student.nsuId}</div>
                    </div>
                    <div>
                      <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Tutor</div>
                      {req.assignedTutor ? (
                        <div className="font-medium text-main">{req.assignedTutor.name}</div>
                      ) : (
                        <div className="text-muted italic">Unassigned</div>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-2 rounded">
                    <div>
                      <div className="text-muted text-xs">Mode</div>
                      <div className="font-medium">{req.preferredMode}</div>
                    </div>
                    <div>
                      <div className="text-muted text-xs">Budget</div>
                      <div className="font-medium text-primary">{req.budget} BDT</div>
                    </div>
                  </div>
                  
                  <div className="mt-2 pt-3 border-t border-color">
                    {/* Action & Info handling (same logic as desktop) */}
                    {req.status === 'PENDING' && (
                      <AssignTutorForm requestId={req.id} courseId={req.courseId} tutors={tutors} />
                    )}

                    {req.status === 'PAYMENT_PENDING' && req.payment && (
                      <div className="bg-primary-light p-3 rounded-md border border-primary text-sm">
                        <div className="mb-1"><strong className="text-primary">MFS Info:</strong> {req.payment.mfsType} ({req.payment.accountNumber})</div>
                        <div className="mb-3"><strong className="text-primary">Amount:</strong> {req.payment.amount} BDT | <strong>Txn:</strong> {req.payment.transactionId}</div>
                        
                        <div className="flex gap-2">
                          {confirmAction?.type === `pay-approve-${req.id}` ? (
                            <>
                              <button onClick={() => handleVerifyPayment(req.id, true)} disabled={loadingId === req.id} className="btn bg-success text-white px-3 py-1 text-xs flex-1" aria-label="Confirm payment approval for {req.course.name} request from {req.student.name}">
                                {loadingId === req.id ? '...' : 'Confirm'}
                              </button>
                              <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel payment approval">Cancel</button>
                            </>
                          ) : confirmAction?.type === `pay-reject-${req.id}` ? (
                            <>
                              <button onClick={() => handleVerifyPayment(req.id, false)} disabled={loadingId === req.id} className="btn bg-danger text-white px-3 py-1 text-xs flex-1" aria-label="Confirm payment rejection for {req.course.name} request from {req.student.name}">
                                {loadingId === req.id ? '...' : 'Confirm'}
                              </button>
                              <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel payment rejection">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setConfirmAction({ type: `pay-approve-${req.id}`, id: req.id })} disabled={loadingId === req.id} className="btn bg-success text-white px-3 py-1 text-xs flex-1" aria-label="Initiate payment approval for {req.course.name} request from {req.student.name}">Approve</button>
                              <button onClick={() => setConfirmAction({ type: `pay-reject-${req.id}`, id: req.id })} disabled={loadingId === req.id} className="btn bg-danger text-white px-3 py-1 text-xs flex-1" aria-label="Initiate payment rejection for {req.course.name} request from {req.student.name}">Reject</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {pendingRefund && (
                      <div className="bg-warning-light p-3 rounded-md border border-warning text-sm">
                        <div className="font-semibold text-warning-hover mb-1">Refund Reason:</div>
                        <div className="italic bg-white p-2 rounded shadow-sm text-main mb-3">"{pendingRefund.details}"</div>
                        
                        <div className="flex gap-2">
                          {confirmAction?.type === `ref-approve-${pendingRefund.id}` ? (
                            <>
                              <button onClick={() => handleVerifyRefund(pendingRefund.id, req.id, true)} disabled={loadingId === pendingRefund.id} className="btn bg-success text-white px-3 py-1 text-xs flex-1" aria-label="Confirm refund approval for {req.course.name} from {req.student.name}">
                                {loadingId === pendingRefund.id ? '...' : 'Confirm'}
                              </button>
                              <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel refund approval">Cancel</button>
                            </>
                          ) : confirmAction?.type === `ref-reject-${pendingRefund.id}` ? (
                            <>
                              <button onClick={() => handleVerifyRefund(pendingRefund.id, req.id, false)} disabled={loadingId === pendingRefund.id} className="btn bg-danger text-white px-3 py-1 text-xs flex-1" aria-label="Confirm refund rejection for {req.course.name} from {req.student.name}">
                                {loadingId === pendingRefund.id ? '...' : 'Confirm'}
                              </button>
                              <button onClick={() => setConfirmAction(null)} className="btn bg-gray-200 text-main px-3 py-1 text-xs" aria-label="Cancel refund rejection">Cancel</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => setConfirmAction({ type: `ref-approve-${pendingRefund.id}`, id: pendingRefund.id })} disabled={loadingId === pendingRefund.id} className="btn bg-success text-white px-3 py-1 text-xs flex-1" aria-label="Initiate refund approval for {req.course.name} from {req.student.name}">Approve Refund</button>
                              <button onClick={() => setConfirmAction({ type: `ref-reject-${pendingRefund.id}`, id: pendingRefund.id })} disabled={loadingId === pendingRefund.id} className="btn bg-danger text-white px-3 py-1 text-xs flex-1" aria-label="Initiate refund rejection for {req.course.name} from {req.student.name}">Reject Refund</button>
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {req.status !== 'PENDING' && req.status !== 'PAYMENT_PENDING' && !pendingRefund && (
                      <span className="text-sm text-muted">
                        No pending actions
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted">
              No requests found matching your filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
