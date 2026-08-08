'use client';

import { useState, useTransition } from 'react';
import { Check, X, Ban, RotateCcw } from 'lucide-react';
import { moderateListing } from '@/app/(member)/shop/disputes/actions';
import styles from './AdminListingActions.module.css';

interface Props {
  listingId: string;
  status: string;
  title: string;
}

export default function AdminListingActions({ listingId, status, title }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  function run(action: 'approve' | 'reject' | 'takedown' | 'restore') {
    setError('');
    setPending(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listingId', listingId);
      fd.set('action', action);
      const res = await moderateListing(fd);
      setPending(false);
      if (!res.ok) setError(res.error);
    });
  }

  const buttons: Array<{
    action: 'approve' | 'reject' | 'takedown' | 'restore';
    label: string;
    icon: React.ReactNode;
    danger?: boolean;
    show: boolean;
  }> = [
    { action: 'approve', label: 'Approve', icon: <Check size={12} />, show: status === 'PENDING_REVIEW' || status === 'REJECTED' },
    { action: 'reject', label: 'Reject', icon: <X size={12} />, show: status === 'PENDING_REVIEW' || status === 'ACTIVE' || status === 'PAUSED', danger: true },
    { action: 'takedown', label: 'Takedown', icon: <Ban size={12} />, show: status === 'ACTIVE' || status === 'PAUSED', danger: true },
    { action: 'restore', label: 'Restore', icon: <RotateCcw size={12} />, show: status === 'REMOVED' || status === 'REJECTED' },
  ];

  return (
    <div className={styles.wrap}>
      {error && <div role='alert' className={styles.error} title={error}>!</div>}
      <div className={styles.btnRow}>
        {buttons
          .filter((b) => b.show)
          .map((b) => (
            <button
              key={b.action}
              type='button'
              className={`${styles.btn} ${b.danger ? styles.danger : ''}`}
              disabled={pending}
              onClick={() => {
                if (!confirm(`${b.label} "${title}"?`)) return;
                run(b.action);
              }}
              title={b.label}
            >
              {b.icon}
              <span className={styles.btnLabel}>{b.label}</span>
            </button>
          ))}
      </div>
    </div>
  );
}
