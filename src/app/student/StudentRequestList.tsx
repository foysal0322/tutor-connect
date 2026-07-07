'use client';

import { useState, useTransition } from 'react';
import { submitPayment, completeTutorRequest, submitRefundRequest, cancelTutorRequest } from './actions';
import { useToast } from '@/components/ToastProvider';
import styles from '../dashboard.module.css';

interface RequestListProps {
  initialRequests: any[];
}

export default function StudentRequestList({ initialRequests }: RequestListProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);
  const [activeRefundId, setActiveRefundId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [confirmCompleteId, setConfirmCompleteId] = useState<string | null>(null);
  
  // Rating/Review State
  const [completeRating, setCompleteRating] = useState(0);
  const [completeReview, setCompleteReview] = useState('');
  
  // Payment Form States
  const [mfsType, setMfsType] = useState<'BKASH' | 'NAGAD' | 'ROCKET'>('BKASH');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [transactionId, setTransactionId] = useState('');
  
  // Refund Form State
  const [refundDetails, setRefundDetails] = useState('');

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleCancel = async (id: string) => {
    setConfirmCancelId(null);
    const res = await cancelTutorRequest(id);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Request cancelled successfully.');
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'CANCELLED' } : r));
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent, requestId: string) => {
    e.preventDefault();
    
    if (!accountNumber || !amount || !transactionId) {
      toast.error('Please fill in all payment fields.');
      return;
    }

    const formData = new FormData();
    formData.append('requestId', requestId);
    formData.append('mfsType', mfsType);
    formData.append('accountNumber', accountNumber);
    formData.append('amount', amount);
    formData.append('transactionId', transactionId);

    startTransition(async () => {
      const res = await submitPayment(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Payment details submitted! Verification pending.');
        setRequests(prev => prev.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              status: 'PAYMENT_PENDING',
              payment: { mfsType, accountNumber, amount: parseFloat(amount), transactionId }
            };
          }
          return r;
        }));
        setActivePaymentId(null);
        setAccountNumber('');
        setAmount('');
        setTransactionId('');
      }
    });
  };

  const handleComplete = async (requestId: string, rating: number, review: string) => {
    setConfirmCompleteId(null);
    const res = await completeTutorRequest(requestId, rating || null, review || null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Session marked as completed.');
      setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'COMPLETED' } : r));
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent, requestId: string) => {
    e.preventDefault();

    if (!refundDetails.trim()) {
      toast.error('Please describe your reason for requesting a refund.');
      return;
    }

    const formData = new FormData();
    formData.append('requestId', requestId);
    formData.append('details', refundDetails);

    startTransition(async () => {
      const res = await submitRefundRequest(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success('Refund request submitted for admin review.');
        setRequests(prev => prev.map(r => {
          if (r.id === requestId) {
            return {
              ...r,
              refundRequests: [{ status: 'PENDING', details: refundDetails, createdAt: new Date() }]
            };
          }
          return r;
        }));
        setActiveRefundId(null);
        setRefundDetails('');
      }
    });
  };

  const getStatusBadge = (status: string, refundRequests?: any[]) => {
    if (refundRequests && refundRequests.length > 0) {
      const ref = refundRequests[0];
      if (ref.status === 'PENDING') return { label: 'Refund Pending', bg: '#fee2e2', color: '#b91c1c' };
      if (ref.status === 'APPROVED') return { label: 'Refunded', bg: '#f1f5f9', color: '#475569' };
      if (ref.status === 'REJECTED') return { label: 'Refund Rejected', bg: '#ffedd5', color: '#ea580c' };
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {requests.length === 0 ? (
        <div className={styles.card} style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>You haven&apos;t requested any tutors yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100%, 1fr))', gap: '1.5rem' }}>
          {requests.map(req => {
            const badge = getStatusBadge(req.status, req.refundRequests);
            const isRefunded = req.refundRequests && req.refundRequests.some((r: any) => r.status === 'APPROVED');
            
            return (
              <div key={req.id} className={styles.card} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', borderLeft: `6px solid ${badge.color}` }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {req.course.name}
                    </h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Requested on {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '50px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: badge.bg,
                    color: badge.color
                  }}>
                    {badge.label}
                  </span>
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'var(--bg-color)', padding: '1rem', borderRadius: '8px' }}>
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
                  <div>
                    <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Budget</span>
                    <strong>{req.budget} BDT</strong>
                  </div>
                </div>

                {/* Tutor Assignment Details */}
                {req.assignedTutor && (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: '#f8fafc' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--text-main)' }}>Assigned Tutor Details</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>Name: <strong>{req.assignedTutor.name}</strong></p>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>Department: <strong>{req.assignedTutor.department?.name || 'N/A'}</strong></p>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>CGPA: <strong>{req.assignedTutor.cgpa?.toFixed(2) || 'N/A'}</strong></p>
                      <p style={{ margin: 0, fontSize: '0.95rem' }}>Gender: <strong>{req.assignedTutor.gender || 'N/A'}</strong></p>
                    </div>

                    {/* Contact details only visible when status is ACCEPTED (unless refunded/cancelled) */}
                    {req.status === 'ACCEPTED' && !isRefunded ? (
                      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)', background: '#eff6ff', padding: '0.75rem', borderRadius: '6px', color: 'var(--primary)' }}>
                        <p style={{ margin: '0 0 0.25rem 0', fontWeight: 600 }}>Tutor Contact Information:</p>
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>📧 Email: <a href={`mailto:${req.assignedTutor.email}`} style={{ textDecoration: 'underline', color: 'var(--primary)' }}>{req.assignedTutor.email}</a></p>
                        <p style={{ margin: 0, fontSize: '0.95rem' }}>📞 Phone: <a href={`tel:${req.assignedTutor.contact}`} style={{ textDecoration: 'underline', color: 'var(--primary)' }}>{req.assignedTutor.contact}</a></p>
                      </div>
                    ) : req.status === 'MATCHED' ? (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        🔒 <em>Contact details will be visible after your payment is verified.</em>
                      </div>
                    ) : req.status === 'PAYMENT_PENDING' ? (
                      <div style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        🕒 <em>Contact details will be visible once the admin approves your payment.</em>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Footer Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 'auto' }}>
                  {req.status === 'PENDING' && confirmCancelId !== req.id && (
                    <button
                      onClick={() => setConfirmCancelId(req.id)}
                      className="btn"
                      style={{ background: '#ef4444', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px' }}
                    >
                      Cancel Request
                    </button>
                  )}

                  {/* Inline cancel confirmation — no browser confirm() */}
                  {confirmCancelId === req.id && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', background: '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #fecaca' }}>
                      <span style={{ fontSize: '0.9rem', color: '#991b1b' }}>Cancel this request?</span>
                      <button
                        onClick={() => handleCancel(req.id)}
                        className="btn"
                        style={{ background: '#ef4444', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                      >
                        Yes, Cancel
                      </button>
                      <button
                        onClick={() => setConfirmCancelId(null)}
                        className="btn"
                        style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                      >
                        Keep
                      </button>
                    </div>
                  )}

                  {req.status === 'MATCHED' && activePaymentId !== req.id && (
                    <button
                      onClick={() => {
                        setActivePaymentId(req.id);
                        setAmount((req.budget * 1.05).toFixed(2));
                      }}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                    >
                      Proceed to MFS Payment
                    </button>
                  )}

                  {req.status === 'ACCEPTED' && !isRefunded && (
                    <>
                      {confirmCompleteId !== req.id ? (
                        <button
                          onClick={() => { setConfirmCompleteId(req.id); setCompleteRating(0); setCompleteReview(''); }}
                          className="btn"
                          style={{ background: 'var(--success)', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}
                        >
                          Mark Session Completed
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', background: '#f0fdf4', padding: '1rem', borderRadius: '8px', border: '1px solid #bbf7d0', flex: '1 1 100%' }}>
                          <span style={{ fontSize: '1rem', color: '#166534', fontWeight: 600 }}>Rate your session (Optional)</span>
                          
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <button 
                                key={star} 
                                type="button"
                                onClick={() => setCompleteRating(star)} 
                                style={{ background: 'none', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: star <= completeRating ? '#fbbf24' : '#cbd5e1', padding: 0 }}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          
                          <textarea 
                            placeholder="Write a review (optional)..." 
                            value={completeReview}
                            onChange={(e) => setCompleteReview(e.target.value)}
                            style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #bbf7d0', resize: 'vertical', fontFamily: 'inherit' }}
                            rows={2}
                          />

                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                            <button
                              onClick={() => handleComplete(req.id, completeRating, completeReview)}
                              className="btn"
                              style={{ background: 'var(--success)', color: 'white', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 600 }}
                            >
                              Submit & Complete
                            </button>
                            <button
                              onClick={() => setConfirmCompleteId(null)}
                              className="btn"
                              style={{ background: '#e2e8f0', color: 'var(--text-main)', padding: '0.5rem 1rem', borderRadius: '6px', fontSize: '0.9rem' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                      
                      {(!req.refundRequests || req.refundRequests.length === 0) && activeRefundId !== req.id && (
                        <button
                          onClick={() => setActiveRefundId(req.id)}
                          className="btn"
                          style={{ background: '#f59e0b', color: 'white', padding: '0.5rem 1.25rem', borderRadius: '8px', fontWeight: 600 }}
                        >
                          Request Refund
                        </button>
                      )}
                    </>
                  )}
                </div>

                {/* Payment Form (Nested) */}
                {activePaymentId === req.id && (
                  <form onSubmit={(e) => handlePaymentSubmit(e, req.id)} style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: 0 }}>MFS Payment Info</h4>
                    
                    {/* Breakdown section */}
                    <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}>
                      <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.4rem 0' }}>
                        <span>Base Tuition Fee:</span>
                        <span>{req.budget} BDT</span>
                      </p>
                      <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.4rem 0', color: 'var(--text-muted)' }}>
                        <span>Platform Fee (10%):</span>
                        <span>+{(req.budget * 0.1).toFixed(2)} BDT</span>
                      </p>
                      <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.4rem 0', color: 'var(--success)' }}>
                        <span>Promo Discount (-50%):</span>
                        <span>-{(req.budget * 0.05).toFixed(2)} BDT</span>
                      </p>
                      <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                      <p style={{ display: 'flex', justifyContent: 'space-between', margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
                        <span>Total Payable (including 5% Platform Fee):</span>
                        <span>{(req.budget * 1.05).toFixed(2)} BDT</span>
                      </p>
                    </div>

                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                      Choose your preferred mobile financial service and enter the details.
                    </p>

                    {/* MFS Providers */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setMfsType('BKASH')}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: mfsType === 'BKASH' ? '2px solid #d1417a' : '1px solid var(--border-color)',
                          background: mfsType === 'BKASH' ? '#fdf2f7' : 'white',
                          color: mfsType === 'BKASH' ? '#d1417a' : 'var(--text-main)',
                          fontWeight: 600
                        }}
                      >
                        bKash
                      </button>
                      <button
                        type="button"
                        onClick={() => setMfsType('NAGAD')}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: mfsType === 'NAGAD' ? '2px solid #f67221' : '1px solid var(--border-color)',
                          background: mfsType === 'NAGAD' ? '#fff7ed' : 'white',
                          color: mfsType === 'NAGAD' ? '#f67221' : 'var(--text-main)',
                          fontWeight: 600
                        }}
                      >
                        Nagad
                      </button>
                      <button
                        type="button"
                        onClick={() => setMfsType('ROCKET')}
                        style={{
                          padding: '0.75rem',
                          borderRadius: '8px',
                          border: mfsType === 'ROCKET' ? '2px solid #8c2a8c' : '1px solid var(--border-color)',
                          background: mfsType === 'ROCKET' ? '#faf5ff' : 'white',
                          color: mfsType === 'ROCKET' ? '#8c2a8c' : 'var(--text-main)',
                          fontWeight: 600
                        }}
                      >
                        Rocket
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                      <div>
                        <label htmlFor={`account-${req.id}`} style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>MFS Account Number</label>
                        <input
                          id={`account-${req.id}`}
                          type="text"
                          required
                          placeholder="e.g. 017XXXXXXXX"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`amount-${req.id}`} style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Amount (BDT)</label>
                        <input
                          id={`amount-${req.id}`}
                          type="number"
                          required
                          readOnly
                          value={amount}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#f1f5f9', cursor: 'not-allowed' }}
                        />
                      </div>
                      <div>
                        <label htmlFor={`txn-${req.id}`} style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.25rem', color: 'var(--text-muted)' }}>Transaction ID</label>
                        <input
                          id={`txn-${req.id}`}
                          type="text"
                          required
                          placeholder="e.g. TRX847927"
                          value={transactionId}
                          onChange={(e) => setTransactionId(e.target.value)}
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setActivePaymentId(null)}
                        className="btn"
                        style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: 'var(--text-main)', borderRadius: '6px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isPending}
                        className="btn-primary"
                        style={{ padding: '0.5rem 1.25rem' }}
                      >
                        {isPending ? '⏳ Submitting...' : 'Submit Payment'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Refund Form (Nested) */}
                {activeRefundId === req.id && (
                  <form onSubmit={(e) => handleRefundSubmit(e, req.id)} style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#f59e0b' }}>Request Refund</h4>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: 0 }}>
                      Describe why you are requesting a refund according to our refund policy.
                    </p>

                    <div>
                      <label htmlFor={`refund-${req.id}`} className="sr-only">Refund reason</label>
                      <textarea
                        id={`refund-${req.id}`}
                        required
                        rows={3}
                        placeholder="Reason for refund request..."
                        value={refundDetails}
                        onChange={(e) => setRefundDetails(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', resize: 'vertical', fontFamily: 'inherit' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setActiveRefundId(null)}
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
                        {isPending ? '⏳ Submitting...' : 'Submit Refund'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
