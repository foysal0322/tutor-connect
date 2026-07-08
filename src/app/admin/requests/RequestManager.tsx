'use client';

import { useState, useMemo, useEffect } from 'react';
import styles from '../../dashboard.module.css';
import AssignTutorForm from './AssignTutorForm';
import { verifyPaymentAction, verifyRefundAction } from './actions';
import { useToast } from '@/components/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';

export default function RequestManager({ initialRequests, tutors }: { initialRequests: any[], tutors: any[] }) {
  const [requests, setRequests] = useState(initialRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string; extra?: any } | null>(null);
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
    const res = await verifyPaymentAction(requestId, approve);
    if (res?.error) {
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
    setLoadingId(null);
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

    if (hasPendingRefund) return { label: 'Refund Requested', bg: '#fee2e2', color: '#ef4444' };
    if (hasApprovedRefund) return { label: 'Refunded (Cancelled)', bg: '#f1f5f9', color: '#475569' };
    if (hasRejectedRefund) return { label: 'Active (Refund Rejected)', bg: '#ffedd5', color: '#ea580c' };

    switch (req.status) {
      case 'PENDING':
        return { label: 'Pending', bg: '#fef3c7', color: '#d97706' };
      case 'MATCHED':
        return { label: 'Matched (Unpaid)', bg: '#dbeafe', color: '#1d4ed8' };
      case 'PAYMENT_PENDING':
        return { label: 'Payment Verifying', bg: '#e0e7ff', color: '#4f46e5' };
      case 'ACCEPTED':
        return { label: 'Active Session', bg: '#d1fae5', color: '#059669' };
      case 'COMPLETED':
        return { label: 'Completed', bg: '#f1f5f9', color: '#64748b' };
      case 'CANCELLED':
        return { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b' };
      default:
        return { label: req.status, bg: '#e2e8f0', color: '#475569' };
    }
  };

  return (
    <div className={styles.card}>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
        <input 
          type="text" 
          placeholder="Search by course, student, or topic..." 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', flex: 1 }}
        />
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="MATCHED">Matched</option>
          <option value="PAYMENT_PENDING">Payment Verifying</option>
          <option value="ACCEPTED">Active Session</option>
          <option value="COMPLETED">Completed</option>
          <option value="REFUND_REQUESTED">Refund Requested</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
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
                const badge = getStatusBadgeColors(req);
                const pendingRefund = req.refundRequests && req.refundRequests.find((r: any) => r.status === 'PENDING');
                
                return (
                  <tr key={req.id}>
                    <td>
                      <strong>{req.student.name}</strong><br/>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>ID: {req.student.nsuId}</span><br/>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {req.student.email}</span>
                    </td>
                    <td>
                      <strong>{req.course.name}</strong><br/>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Topic: {req.topic}</span><br/>
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Mode: {req.preferredMode}</span><br/>
                      {req.preferredDateTime && (
                        <><span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Time: {new Date(req.preferredDateTime).toLocaleString()}</span><br/></>
                      )}
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Budget: {req.budget} BDT</span>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.6rem', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: badge.bg,
                        color: badge.color
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      {req.assignedTutor ? (
                        <div>
                          <strong>{req.assignedTutor.name}</strong><br/>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Email: {req.assignedTutor.email}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
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
                        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0' }}><strong>MFS Info:</strong> {req.payment.mfsType}</p>
                          <p style={{ margin: '0 0 0.5rem 0' }}><strong>Account:</strong> {req.payment.accountNumber}</p>
                          <p style={{ margin: '0 0 0.5rem 0' }}><strong>Amount:</strong> {req.payment.amount} BDT</p>
                          <p style={{ margin: '0 0 0.75rem 0' }}><strong>Txn ID:</strong> <code style={{ background: '#e2e8f0', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{req.payment.transactionId}</code></p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {confirmAction?.type === `pay-approve-${req.id}` ? (
                              <>
                                <span style={{ fontSize: '0.85rem', color: '#166534', alignSelf: 'center' }}>Approve this payment?</span>
                                <button onClick={() => handleVerifyPayment(req.id, true)} disabled={loadingId === req.id} className="btn" style={{ background: 'var(--success)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>{loadingId === req.id ? '⏳' : 'Yes, Approve'}</button>
                                <button onClick={() => setConfirmAction(null)} className="btn" style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Cancel</button>
                              </>
                            ) : confirmAction?.type === `pay-reject-${req.id}` ? (
                              <>
                                <span style={{ fontSize: '0.85rem', color: '#991b1b', alignSelf: 'center' }}>Reject this payment?</span>
                                <button onClick={() => handleVerifyPayment(req.id, false)} disabled={loadingId === req.id} className="btn" style={{ background: 'var(--error)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>{loadingId === req.id ? '⏳' : 'Yes, Reject'}</button>
                                <button onClick={() => setConfirmAction(null)} className="btn" style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setConfirmAction({ type: `pay-approve-${req.id}`, id: req.id })} disabled={loadingId === req.id} className="btn" style={{ background: 'var(--success)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Approve</button>
                                <button onClick={() => setConfirmAction({ type: `pay-reject-${req.id}`, id: req.id })} disabled={loadingId === req.id} className="btn" style={{ background: 'var(--error)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Reject</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Case 3: Refund request is pending approval */}
                      {pendingRefund && (
                        <div style={{ background: '#fffbeb', padding: '0.75rem', borderRadius: '8px', border: '1px solid #fde68a', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                          <p style={{ margin: '0 0 0.5rem 0', color: '#b45309' }}><strong>Refund Reason:</strong></p>
                          <p style={{ margin: '0 0 0.75rem 0', fontStyle: 'italic', background: 'white', padding: '0.5rem', borderRadius: '4px', border: '1px solid #fef3c7' }}>"{pendingRefund.details}"</p>
                          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {confirmAction?.type === `ref-approve-${pendingRefund.id}` ? (
                              <>
                                <span style={{ fontSize: '0.85rem', color: '#166534', alignSelf: 'center' }}>Approve refund?</span>
                                <button onClick={() => handleVerifyRefund(pendingRefund.id, req.id, true)} disabled={loadingId === pendingRefund.id} className="btn" style={{ background: 'var(--success)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>{loadingId === pendingRefund.id ? '⏳' : 'Yes, Approve'}</button>
                                <button onClick={() => setConfirmAction(null)} className="btn" style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Cancel</button>
                              </>
                            ) : confirmAction?.type === `ref-reject-${pendingRefund.id}` ? (
                              <>
                                <span style={{ fontSize: '0.85rem', color: '#991b1b', alignSelf: 'center' }}>Reject refund?</span>
                                <button onClick={() => handleVerifyRefund(pendingRefund.id, req.id, false)} disabled={loadingId === pendingRefund.id} className="btn" style={{ background: 'var(--error)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>{loadingId === pendingRefund.id ? '⏳' : 'Yes, Reject'}</button>
                                <button onClick={() => setConfirmAction(null)} className="btn" style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Cancel</button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => setConfirmAction({ type: `ref-approve-${pendingRefund.id}`, id: pendingRefund.id })} disabled={loadingId === pendingRefund.id} className="btn" style={{ background: 'var(--success)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Approve Refund</button>
                                <button onClick={() => setConfirmAction({ type: `ref-reject-${pendingRefund.id}`, id: pendingRefund.id })} disabled={loadingId === pendingRefund.id} className="btn" style={{ background: 'var(--error)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}>Reject Refund</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Fallback label when no actions are available */}
                      {req.status !== 'PENDING' && req.status !== 'PAYMENT_PENDING' && !pendingRefund && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                          No pending actions
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No requests found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
