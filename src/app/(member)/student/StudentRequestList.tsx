'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Star, Mail, Phone, Lock, Clock } from 'lucide-react';
import { completeTutorRequest, submitRefundRequest, cancelTutorRequest, cancelRefundRequest } from './actions';
import { useToast } from '@/components/ToastProvider';
import PaymentForm from '@/components/payments/PaymentForm';
import { Textarea } from '@/components/ui/Textarea';
import { Sheet } from '@/components/ui/Sheet';
import DataGrid, { type ColumnDef } from '@/components/ui/DataGrid';
import { fieldClass } from '@/components/forms';

interface RequestListProps {
  initialRequests: any[];
  userBalance?: number;
}

/* ------------------------------------------------------------------ */
/* Status badge — same colours as the previous card layout.            */
/* ------------------------------------------------------------------ */

function getStatusBadge(status: string, refundRequests?: any[]) {
  if (refundRequests && refundRequests.length > 0) {
    const ref = refundRequests[0];
    if (ref.status === 'PENDING')
      return { label: 'Refund Pending', bg: '#fee2e2', color: '#b91c1c' };
    if (ref.status === 'APPROVED')
      return { label: 'Refunded', bg: '#f1f5f9', color: '#475569' };
    if (ref.status === 'REJECTED')
      return { label: 'Refund Rejected', bg: '#ffedd5', color: '#ea580c' };
  }

  switch (status) {
    case 'PENDING':
      return { label: 'Pending Admin', bg: '#fef3c7', color: '#d97706' };
    case 'MATCHED':
      return { label: 'Tutor Matched (Unpaid)', bg: '#dbeafe', color: '#1d4ed8' };
    case 'PAYMENT_PENDING':
      return { label: 'Payment Verifying', bg: '#e0e7ff', color: '#4f46e5' };
    case 'ACCEPTED':
      return { label: 'Active Session', bg: '#d1fae5', color: '#059669' };
    case 'COMPLETED':
      return { label: 'Completed', bg: '#f1f5f9', color: '#64748b' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: '#f1f5f9', color: '#64748b' };
    default:
      return { label: status, bg: '#e2e8f0', color: '#475569' };
  }
}

/* ------------------------------------------------------------------ */
/* DataGrid columns                                                    */
/* ------------------------------------------------------------------ */

const columns: ColumnDef<any>[] = [
  {
    header: 'Course',
    accessorKey: 'course.name',
    sortable: true,
    cell: (r) => <strong>{r.course.name}</strong>,
  },
  {
    header: 'Status',
    id: 'status',
    sortable: true,
    cell: (r) => {
      const badge = getStatusBadge(r.status, r.refundRequests);
      return (
        <span
          style={{
            padding: '0.25rem 0.6rem',
            borderRadius: '50px',
            fontSize: '0.75rem',
            fontWeight: 600,
            backgroundColor: badge.bg,
            color: badge.color,
            whiteSpace: 'nowrap',
          }}
        >
          {badge.label}
        </span>
      );
    },
  },
  {
    header: 'Budget',
    accessorKey: 'budget',
    sortable: true,
    cell: (r) => `${r.budget} BDT`,
  },
  {
    header: 'Tutor',
    id: 'tutor',
    cell: (r) => r.assignedTutor?.name ?? <span style={{ color: 'var(--text-muted)' }}>Not assigned</span>,
  },
  {
    header: 'Date',
    accessorKey: 'createdAt',
    sortable: true,
    cell: (r) => new Date(r.createdAt).toLocaleDateString(),
  },
];

/* ------------------------------------------------------------------ */
/* Main component                                                      */
/* ------------------------------------------------------------------ */

export default function StudentRequestList({ initialRequests, userBalance = 0 }: RequestListProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [mode, setMode] = useState<'details' | 'cancel' | 'payment' | 'complete' | 'refund' | 'cancel-refund'>('details');

  // Rating/Review state
  const [completeRating, setCompleteRating] = useState(0);
  const [completeReview, setCompleteReview] = useState('');

  // Refund form state
  const [refundDetails, setRefundDetails] = useState('');
  // Inline error for the refund form — rendered inside the Sheet (the global
  // toast renders behind the open drawer and is invisible — same bug as the
  // admin wallet-adjust Sheet, fixed 2026-08-04).
  const [refundError, setRefundError] = useState('');

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const activeRequest = requests.find((r) => r.id === activeRequestId) ?? null;

  // Reset form state when the Sheet target changes.
  function openDetail(reqId: string) {
    setActiveRequestId(reqId);
    setMode('details');
    setCompleteRating(0);
    setCompleteReview('');
    setRefundDetails('');
    setRefundError('');
  }

  function closeDetail() {
    setActiveRequestId(null);
    setMode('details');
  }

  /* ----- handlers (unchanged from the previous card implementation) ----- */

  const handleCancel = async (id: string) => {
    setMode('details');
    closeDetail();
    const res = await cancelTutorRequest(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Request cancelled successfully.');
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'CANCELLED' } : r)));
    }
  };

  const handleComplete = async (requestId: string, rating: number, review: string) => {
    setMode('details');
    closeDetail();
    const res = await completeTutorRequest(requestId, rating || null, review || null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Session marked as completed.');
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, status: 'COMPLETED' } : r)));
    }
  };

  const handleCancelRefund = async (refundRequestId: string, requestId: string) => {
    setMode('details');
    closeDetail();
    const res = await cancelRefundRequest(refundRequestId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Refund request cancelled. The session is active again.');
      // Drop the cancelled refund from local state so the action buttons
      // (Complete / Request Refund) reappear without a refetch.
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, refundRequests: (r.refundRequests || []).filter((rr: any) => rr.id !== refundRequestId) }
            : r,
        ),
      );
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent, requestId: string) => {
    e.preventDefault();
    setRefundError('');
    if (!refundDetails.trim()) {
      // Inline inside the Sheet — the toast would be hidden behind the drawer.
      setRefundError('Please describe your reason for requesting a refund.');
      return;
    }

    const formData = new FormData();
    formData.append('requestId', requestId);
    formData.append('details', refundDetails);

    startTransition(async () => {
      const res = await submitRefundRequest(formData);
      if (res?.error) {
        setRefundError(res.error);
      } else {
        toast.success('Refund request submitted for admin review.');
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId
              ? { ...r, refundRequests: [{ status: 'PENDING', details: refundDetails, createdAt: new Date() }] }
              : r,
          ),
        );
        setMode('details');
        setRefundDetails('');
      }
    });
  };

  /* ----- render ----- */

  if (requests.length === 0) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '3rem 1rem',
          color: 'var(--text-muted)',
        }}
      >
        You haven&apos;t requested any tutors yet.
      </div>
    );
  }

  const req = activeRequest;
  const badge = req ? getStatusBadge(req.status, req.refundRequests) : null;
  const isRefunded = req?.refundRequests?.some((r: any) => r.status === 'APPROVED');
  // A PENDING refund blocks completion (admin owns the next move) and is
  // cancellable by the student. APPROVED/REJECTED are not — those have moved.
  const pendingRefund = req?.refundRequests?.find((r: any) => r.status === 'PENDING');

  return (
    <>
      <DataGrid
        data={requests}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={(r) => openDetail(r.id)}
        searchable
        searchKeys={['course.name', 'topic', 'status', 'assignedTutor.name']}
        itemsPerPage={10}
        emptyMessage="No requests found."
      />

      {/* ---------- Detail Sheet ---------- */}
      <Sheet
        open={!!req}
        onClose={closeDetail}
        title={req?.course.name ?? ''}
        size="40rem"
      >
        {req && badge && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Status badge + date */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span
                style={{
                  padding: '0.35rem 0.75rem',
                  borderRadius: '50px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  backgroundColor: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.label}
              </span>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Requested {new Date(req.createdAt).toLocaleDateString()}
              </span>
            </div>

            {/* Refund outcome banner */}
            {req.refundRequests?.length > 0 &&
              (() => {
                const ref = req.refundRequests[0];
                if (ref.status === 'APPROVED') {
                  return (
                    <div
                      style={{
                        background: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.5rem 1rem',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <strong style={{ color: '#047857' }}>
                          Refunded {ref.amount != null ? `${ref.amount} BDT` : ''} to your wallet
                        </strong>
                        {ref.reviewNote && (
                          <span style={{ display: 'block', fontSize: '0.85rem', color: '#065f46', marginTop: '0.15rem' }}>
                            Note: {ref.reviewNote}
                          </span>
                        )}
                      </div>
                      <Link href="/wallet" style={{ color: '#047857', fontWeight: 600, textDecoration: 'underline' }}>
                        View wallet →
                      </Link>
                    </div>
                  );
                }
                if (ref.status === 'REJECTED') {
                  return (
                    <div
                      style={{
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: '8px',
                        padding: '0.85rem 1rem',
                        color: '#9a3412',
                        fontSize: '0.9rem',
                      }}
                    >
                      <strong>Your refund request was rejected.</strong>
                      {ref.reviewNote && <span style={{ display: 'block', marginTop: '0.15rem' }}>Note: {ref.reviewNote}</span>}
                    </div>
                  );
                }
                return null;
              })()}

            {/* Details grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '1rem',
                background: 'var(--bg-color)',
                padding: '1rem',
                borderRadius: '8px',
              }}
            >
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Topic</span>
                <strong>{req.topic || 'General assistance'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Faculty</span>
                <strong>{req.facultyName || 'Any'}</strong>
              </div>
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Mode</span>
                <strong>{req.preferredMode}</strong>
              </div>
              {req.preferredDateTime && (
                <div>
                  <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preferred Time</span>
                  <strong>{new Date(req.preferredDateTime).toLocaleString()}</strong>
                </div>
              )}
              <div>
                <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Budget</span>
                <strong>{req.budget} BDT</strong>
              </div>
            </div>

            {/* Tutor assignment */}
            {req.assignedTutor && (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--surface-1)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Assigned Tutor</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>Name: <strong>{req.assignedTutor.name}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>Dept: <strong>{req.assignedTutor.department?.name ?? 'N/A'}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>CGPA: <strong>{req.assignedTutor.cgpa?.toFixed(2) ?? 'N/A'}</strong></p>
                  <p style={{ margin: 0, fontSize: '0.95rem' }}>Gender: <strong>{req.assignedTutor.gender ?? 'N/A'}</strong></p>
                </div>

                {req.status === 'ACCEPTED' && !isRefunded ? (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px dashed var(--border-color)',
                      background: 'var(--info-light, #eff6ff)',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      color: 'var(--primary)',
                    }}
                  >
                    <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Mail size={14} /> Contact Information
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Mail size={13} />
                      <a href={`mailto:${req.assignedTutor.email}`} style={{ textDecoration: 'underline' }}>
                        {req.assignedTutor.email}
                      </a>
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Phone size={13} />
                      <a href={`tel:${req.assignedTutor.contact}`} style={{ textDecoration: 'underline' }}>
                        {req.assignedTutor.contact}
                      </a>
                    </p>
                  </div>
                ) : req.status === 'MATCHED' ? (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Lock size={14} /> Contact details will be visible after payment verification.
                  </div>
                ) : req.status === 'PAYMENT_PENDING' ? (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={14} /> Contact details will be visible once the admin approves your payment.
                  </div>
                ) : null}
              </div>
            )}

            {/* ---------- Conditional action area ---------- */}

            {/* Default: show action buttons */}
            {mode === 'details' && (
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                {req.status === 'PENDING' && (
                  <button
                    onClick={() => setMode('cancel')}
                    className="btn"
                    style={{ background: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px' }}
                  >
                    Cancel Request
                  </button>
                )}
                {req.status === 'MATCHED' && (
                  <button
                    onClick={() => setMode('payment')}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    Complete Payment
                  </button>
                )}
                {req.status === 'ACCEPTED' && !isRefunded && (
                  <>
                    {/* Hide "Mark Completed" while a refund is pending — admin
                        owns the next move (approve credits wallet / reject
                        reactivates the session). Student can't complete a
                        session they're asking to be refunded for. */}
                    {!pendingRefund && (
                      <button
                        onClick={() => {
                          setMode('complete');
                          setCompleteRating(0);
                          setCompleteReview('');
                        }}
                        className="btn"
                        style={{ background: 'var(--success)', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}
                      >
                        Mark Completed
                      </button>
                    )}
                    {pendingRefund ? (
                      <button
                        onClick={() => setMode('cancel-refund')}
                        className="btn"
                        style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}
                      >
                        Cancel Refund Request
                      </button>
                    ) : (!req.refundRequests || req.refundRequests.length === 0) ? (
                      <button
                        onClick={() => setMode('refund')}
                        className="btn"
                        style={{ background: '#f59e0b', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}
                      >
                        Request Refund
                      </button>
                    ) : null}
                  </>
                )}
              </div>
            )}

            {/* Cancel confirmation */}
            {mode === 'cancel' && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  background: '#fef2f2',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid #fecaca',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '0.9rem', color: '#991b1b', flex: 1 }}>Cancel this request?</span>
                <button
                  onClick={() => handleCancel(req.id)}
                  className="btn"
                  style={{ background: '#ef4444', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  Yes, Cancel
                </button>
                <button
                  onClick={() => setMode('details')}
                  className="btn"
                  style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  Keep
                </button>
              </div>
            )}

            {/* Cancel-refund confirmation — withdraw the pending refund ask.
                The session reactivates and "Mark Completed" reappears. */}
            {mode === 'cancel-refund' && pendingRefund && (
              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center',
                  background: '#f8fafc',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', flex: 1, minWidth: '12rem' }}>
                  Cancel your refund request? The session stays active and you can re-request a refund later.
                </span>
                <button
                  onClick={() => handleCancelRefund(pendingRefund.id, req.id)}
                  className="btn"
                  style={{ background: 'var(--text-main)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  Yes, Cancel Refund
                </button>
                <button
                  onClick={() => setMode('details')}
                  className="btn"
                  style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                  Keep Refund Request
                </button>
              </div>
            )}

            {/* Payment form */}
            {mode === 'payment' && (
              <PaymentForm
                requestId={req.id}
                budget={req.budget}
                userBalance={userBalance}
                onCancel={() => setMode('details')}
                onPaid={(status, payment) => {
                  setRequests((prev) => prev.map((r) => (r.id === req.id ? { ...r, status, payment } : r)));
                  closeDetail();
                }}
              />
            )}

            {/* Complete + rate */}
            {mode === 'complete' && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                  background: '#f0fdf4',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0',
                }}
              >
                <span style={{ fontSize: '1rem', color: '#166534', fontWeight: 600 }}>Rate your session (Optional)</span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setCompleteRating(star)}
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: '1.75rem',
                        cursor: 'pointer',
                        color: star <= completeRating ? '#fbbf24' : '#cbd5e1',
                        padding: 0,
                      }}
                    >
                      <Star size={28} fill={star <= completeRating ? 'currentColor' : 'none'} />
                    </button>
                  ))}
                </div>
                <div className={fieldClass}>
                  <textarea
                    className="form-textarea"
                    placeholder="Write a review (optional)..."
                    value={completeReview}
                    onChange={(e) => setCompleteReview(e.target.value)}
                    rows={2}
                  />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleComplete(req.id, completeRating, completeReview)}
                    className="btn"
                    style={{ background: 'var(--success)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}
                  >
                    Submit & Complete
                  </button>
                  <button
                    onClick={() => setMode('details')}
                    className="btn"
                    style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Refund form */}
            {mode === 'refund' && (
              <form
                onSubmit={(e) => handleRefundSubmit(e, req.id)}
                style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
              >
                <h4 style={{ margin: 0, color: '#f59e0b' }}>Request Refund</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                  Describe why you are requesting a refund according to our refund policy.
                </p>
                <Textarea
                  containerClassName={fieldClass}
                  id={`refund-${req.id}`}
                  label="Refund reason"
                  required
                  rows={3}
                  placeholder="Reason for refund request..."
                  value={refundDetails}
                  onChange={(e) => setRefundDetails(e.target.value)}
                  error={refundError}
                />
                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setMode('details')}
                    className="btn"
                    style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: 'var(--text-main)', borderRadius: '6px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="btn"
                    style={{ background: '#f59e0b', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px' }}
                  >
                    {isPending ? 'Submitting...' : 'Submit Refund'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </Sheet>
    </>
  );
}
