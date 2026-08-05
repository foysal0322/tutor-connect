'use client';

/**
 * PaymentVerifyRow — inline card shown when a request's payment is awaiting
 * admin verification (req.status === 'PAYMENT_PENDING' + payment present).
 *
 * Phase 6.7: extracted from RequestManager.tsx. Replaces the bespoke
 * two-step "Approve? / Yes Approve" inline confirm with the shared
 * <ConfirmDialog>. The MFS info card stays inline (so admins can see the
 * txn details next to the action); only the confirmation step moves into
 * a modal, matching the rest of the admin app.
 *
 * Contract: receives the parent's `onApprove` / `onReject` callbacks so
 * the request-list state stays owned by RequestManager. The server action
 * (`verifyPaymentAction`) is called by the parent — this component only
 * gathers intent + gate confirmation.
 */

import { useState } from 'react';
import LoadingButton from '@/components/ui/LoadingButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { RequestRow } from './status';

interface PaymentVerifyRowProps {
  req: RequestRow;
  loading: boolean;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string) => void;
}

export default function PaymentVerifyRow({
  req,
  loading,
  onApprove,
  onReject,
}: PaymentVerifyRowProps) {
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);

  if (!req.payment) return null;
  const p = req.payment;

  return (
    <div className='bg-primary-light p-3 rounded-md border border-primary text-sm'>
      <div className='mb-1'>
        <strong className='text-primary'>MFS Info:</strong> {p.mfsType}
      </div>
      <div className='mb-1'>
        <strong className='text-primary'>Account:</strong> {p.accountNumber}
      </div>
      <div className='mb-1'>
        <strong className='text-primary'>Amount:</strong> {p.amount} BDT
      </div>
      <div className='mb-3'>
        <strong className='text-primary'>Txn ID:</strong>{' '}
        <code className='bg-white px-1.5 py-0.5 rounded shadow-sm text-main'>
          {p.transactionId}
        </code>
      </div>

      <div className='flex gap-2 flex-wrap'>
        <LoadingButton
          onClick={() => setPendingAction('approve')}
          loading={loading}
          loadingText='...'
          className='bg-success text-white px-3 py-1 text-xs'
          aria-label={`Approve payment for ${req.course.name} from ${req.student.name}`}
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
        >
          Approve
        </LoadingButton>
        <LoadingButton
          onClick={() => setPendingAction('reject')}
          loading={loading}
          loadingText='...'
          className='bg-danger text-white px-3 py-1 text-xs'
          aria-label={`Reject payment for ${req.course.name} from ${req.student.name}`}
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
        >
          Reject
        </LoadingButton>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction === 'approve') onApprove(req.id);
          else if (pendingAction === 'reject') onReject(req.id);
          setPendingAction(null);
        }}
        loading={loading}
        title={pendingAction === 'approve' ? 'Approve this payment?' : 'Reject this payment?'}
        confirmLabel={pendingAction === 'approve' ? 'Yes, approve' : 'Yes, reject'}
        tone={pendingAction === 'approve' ? 'primary' : 'danger'}
        description={
          <div>
            <p style={{ marginBottom: '0.5rem' }}>
              {pendingAction === 'approve'
                ? 'The session will become active once approved.'
                : 'The payment will be discarded; the request returns to Matched (Unpaid).'}
            </p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {req.student.name} · {req.course.name} · {p.amount} BDT via {p.mfsType}
            </p>
          </div>
        }
      />
    </div>
  );
}
