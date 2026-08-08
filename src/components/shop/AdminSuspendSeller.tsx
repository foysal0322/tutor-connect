'use client';

import { useState, useTransition } from 'react';
import { Ban, RotateCcw } from 'lucide-react';
import { setSellerSuspension } from '@/app/(member)/shop/disputes/actions';
import styles from './AdminSuspendSeller.module.css';

interface Props {
  userId: string;
  isSuspended: boolean;
  userBlocked: boolean;
}

export default function AdminSuspendSeller({ userId, isSuspended, userBlocked }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  if (userBlocked) {
    return <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>;
  }

  function toggle() {
    setError('');
    if (!confirm(isSuspended ? 'Restore this seller?' : 'Suspend this seller? Active listings will be paused; in-flight orders continue.')) return;
    setPending(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('userId', userId);
      fd.set('suspend', isSuspended ? 'false' : 'true');
      const res = await setSellerSuspension(fd);
      setPending(false);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className={styles.wrap}>
      {error && <div className={styles.error} title={error}>!</div>}
      <button
        type='button'
        className={`${styles.btn} ${isSuspended ? '' : styles.danger}`}
        onClick={toggle}
        disabled={pending}
      >
        {isSuspended ? <RotateCcw size={12} /> : <Ban size={12} />}
        <span className={styles.label}>{isSuspended ? 'Restore' : 'Suspend'}</span>
      </button>
    </div>
  );
}
