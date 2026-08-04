'use client';

/**
 * RefundVerifyRow — inline card shown when a request has a PENDING refund.
 *
 * Phase 6.7: extracted from RequestManager.tsx. Replaces the bespoke
 * two-step "Approve & Credit / Confirm Credit" inline confirm with the
 * shared <ConfirmDialog>. The student's reason + amount breakdown stay
 * inline (financial impact must be visible at a glance); the action
 * confirmation + admin note move into a modal.
 *
 * The admin note (Textarea) lives inside the modal body so the admin can
 * attach context that gets persisted on the refund record. State is local
 * to this component — reset when the modal closes.
 *
 * Contract: receives `onApprove(refundId, note?)` / `onReject(refundId, note?)`.
 * Server action (`verifyRefundAction`) is called by the parent.
 */

import { useEffect, useState } from 'react';
import LoadingButton from '@/components/ui/LoadingButton';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Textarea } from '@/components/ui/Textarea';
import { getPendingRefund, type RequestRow } from './status';

interface RefundVerifyRowProps {
  req: RequestRow;
  refundFeePercent: number;
  loading: boolean;
  onApprove: (refundId: string, requestId: string, note?: string) => void;
  onReject: (refundId: string, requestId: string, note?: string) => void;
}

export default function RefundVerifyRow({
  req,
  refundFeePercent,
  loading,
  onApprove,
  onReject,
}: RefundVerifyRowProps) {
  const [pendingAction, setPendingAction] = useState<'approve' | 'reject' | null>(null);
  const [note, setNote] = useState('');

  // Reset the note whenever the modal closes.
  useEffect(() => {
    if (pendingAction === null) setNote('');
  }, [pendingAction]);

  const pendingRefund = getPendingRefund(req);
  if (!pendingRefund) return null;

  const paidAmount = req.payment?.amount ?? req.budget;
  const platformKeeps = Math.round((req.budget * refundFeePercent) / 100);

  return (
    <div className='bg-warning-light p-3 rounded-md border border-warning text-sm mt-2'>
      <div className='flex items-center justify-between mb-2'>
        <span className='font-semibold text-warning-hover'>Refund Request</span>
        <span className='text-xs text-muted'>
          {new Date(pendingRefund.createdAt).toLocaleString()}
        </span>
      </div>

      <div className='font-semibold text-warning-hover mb-1 text-xs uppercase tracking-wide'>
        Student&rsquo;s reason
      </div>
      <div className='italic bg-white p-2 rounded shadow-sm text-main mb-3'>
        &quot;{pendingRefund.details}&quot;
      </div>

      {/* Amount breakdown — make the financial impact obvious. */}
      <div className='grid grid-cols-3 gap-2 mb-3 text-center'>
        <div className='bg-white p-2 rounded border border-color'>
          <div className='text-xs text-muted'>Paid</div>
          <div className='font-semibold text-main'>{paidAmount.toLocaleString()} BDT</div>
        </div>
        <div className='bg-white p-2 rounded border border-color'>
          <div className='text-xs text-muted'>Refund</div>
          <div className='font-semibold text-success'>{req.budget.toLocaleString()} BDT</div>
        </div>
        <div className='bg-white p-2 rounded border border-color'>
          <div className='text-xs text-muted'>Platform keeps</div>
          <div className='font-semibold text-muted'>{platformKeeps.toLocaleString()} BDT</div>
        </div>
      </div>
      <div className='text-xs text-muted mb-3'>
        Approving credits <strong>{req.budget.toLocaleString()} BDT</strong> to the student&rsquo;s
        wallet. The {refundFeePercent}% platform fee is retained.
      </div>

      <div className='flex gap-2 flex-wrap'>
        <LoadingButton
          onClick={() => setPendingAction('approve')}
          loading={loading}
          loadingText='...'
          className='bg-success text-white px-3 py-1 text-xs'
          aria-label={`Approve refund for ${req.course.name} from ${req.student.name}`}
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
        >
          Approve &amp; Credit
        </LoadingButton>
        <LoadingButton
          onClick={() => setPendingAction('reject')}
          loading={loading}
          loadingText='...'
          className='bg-danger text-white px-3 py-1 text-xs'
          aria-label={`Reject refund for ${req.course.name} from ${req.student.name}`}
          style={{ padding: '0.375rem 0.75rem', fontSize: '0.8rem' }}
        >
          Reject
        </LoadingButton>
      </div>

      <ConfirmDialog
        open={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={() => {
          if (pendingAction === 'approve') {
            onApprove(pendingRefund.id, req.id, note || undefined);
          } else if (pendingAction === 'reject') {
            onReject(pendingRefund.id, req.id, note || undefined);
          }
          setPendingAction(null);
        }}
        loading={loading}
        title={
          pendingAction === 'approve'
            ? 'Approve refund & credit wallet?'
            : 'Reject this refund?'
        }
        confirmLabel={
          pendingAction === 'approve' ? `Credit ${req.budget.toLocaleString()} BDT` : 'Yes, reject'
        }
        tone={pendingAction === 'approve' ? 'primary' : 'danger'}
        description={
          <div>
            <p style={{ marginBottom: '0.5rem' }}>
              {pendingAction === 'approve'
                ? `The student receives ${req.budget.toLocaleString()} BDT in their wallet. The session is cancelled.`
                : 'The refund is denied; the session stays in its current status.'}
            </p>
            <Textarea
              label='Admin note (optional)'
              rows={2}
              placeholder='e.g. Approved — session never started. / Rejected — session already completed.'
              value={note}
              onChange={(e) => setNote(e.target.value)}
              hint='Shown to the student and saved on the refund record.'
            />
          </div>
        }
      />
    </div>
  );
}
