'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Scale } from 'lucide-react';
import { openDispute } from '@/app/(marketing)/shop/disputes/actions';
import styles from './OpenDisputeButton.module.css';

interface Props {
  orderId: string;
}

export default function OpenDisputeButton({ orderId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  function handleOpen() {
    setError('');
    if (reason.trim().length < 10) {
      setError('Please provide at least 10 characters of detail.');
      return;
    }
    if (
      !confirm(
        'Open a dispute?\n\nAdmin will review the order and respond. The seller will be notified.',
      )
    ) {
      return;
    }
    setLoading(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('orderId', orderId);
      fd.set('reason', reason.trim());
      const res = await openDispute(fd);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.disputeId) {
        router.push(`/shop/disputes/${res.disputeId}`);
      } else {
        router.push('/shop/disputes');
      }
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type='button'
        className={styles.openBtn}
        onClick={() => setOpen(true)}
      >
        <Scale size={14} aria-hidden='true' /> Open a dispute
      </button>
    );
  }

  return (
    <div className={styles.form}>
      {error && (
        <div role='alert' className={styles.error}>
          {error}
        </div>
      )}
      <label htmlFor='reason' className={styles.label}>
        What went wrong?
      </label>
      <textarea
        id='reason'
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={4}
        maxLength={5000}
        placeholder='Describe the issue — wrong item, never delivered, condition mismatch, etc.'
        className={styles.textarea}
        disabled={loading}
      />
      <div className={styles.actions}>
        <button
          type='button'
          className={styles.cancelBtn}
          onClick={() => {
            setOpen(false);
            setReason('');
            setError('');
          }}
          disabled={loading}
        >
          Cancel
        </button>
        <button
          type='button'
          className={styles.submitBtn}
          onClick={handleOpen}
          disabled={loading}
        >
          {loading ? 'Opening…' : 'Submit dispute'}
        </button>
      </div>
    </div>
  );
}
