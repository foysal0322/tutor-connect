'use client';

import { useState } from 'react';
import PaymentForm from '@/components/payments/PaymentForm';

interface PendingPaymentsSectionProps {
  initialPending: any[];
  userBalance: number;
}

// Lists MATCHED requests that still await payment, with an inline payment form.
// On a successful payment the item is removed from local state (it then shows
// up in "Payment History" once the server revalidates the page).
export default function PendingPaymentsSection({
  initialPending,
  userBalance = 0,
}: PendingPaymentsSectionProps) {
  const [pending, setPending] = useState(initialPending);
  const [activePaymentId, setActivePaymentId] = useState<string | null>(null);

  if (pending.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-2">
        <h2 className="m-0">Pending Payments</h2>
        <span className="badge badge-warning">{pending.length}</span>
      </div>
      <p className="text-muted mb-4">
        These tutor matches are waiting for your payment. Complete payment to activate each session.
      </p>

      <div className="flex flex-col gap-4">
        {pending.map((req) => {
          const totalPayable = (req.budget * 1.05).toFixed(2);
          return (
            <div
              key={req.id}
              className="card p-4 flex flex-col gap-3"
              style={{ borderLeft: '6px solid #1d4ed8' }}
            >
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <h3 className="m-0" style={{ fontSize: '1.15rem' }}>
                    {req.course.name}
                  </h3>
                  <span className="text-muted" style={{ fontSize: '0.85rem' }}>
                    Requested on {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <span className="badge badge-info">Awaiting Payment</span>
              </div>

              {req.assignedTutor && (
                <div className="text-sm text-muted">
                  Assigned tutor: <strong>{req.assignedTutor.name}</strong>
                  {req.assignedTutor.department?.name
                    ? ` · ${req.assignedTutor.department.name}`
                    : ''}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  Tuition: <strong>{req.budget} BDT</strong> &middot; Total payable (incl. 5% fee):{' '}
                  <strong>{totalPayable} BDT</strong>
                </span>
                {activePaymentId !== req.id && (
                  <button
                    onClick={() => setActivePaymentId(req.id)}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.9rem' }}
                  >
                    Proceed to Payment
                  </button>
                )}
              </div>

              {activePaymentId === req.id && (
                <PaymentForm
                  requestId={req.id}
                  budget={req.budget}
                  userBalance={userBalance}
                  onCancel={() => setActivePaymentId(null)}
                  onPaid={() => setPending((prev) => prev.filter((r) => r.id !== req.id))}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
