'use client';

import { useState, useTransition } from 'react';
import { X, Ban } from 'lucide-react';
import { handleReport } from '@/app/(member)/shop/disputes/actions';
import styles from './AdminReportActions.module.css';

interface Props {
  reportId: string;
  status: string;
}

export default function AdminReportActions({ reportId, status }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  if (status !== 'OPEN' && status !== 'ACKNOWLEDGED') {
    return <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>—</span>;
  }

  function run(action: 'dismiss' | 'takedown') {
    setError('');
    setPending(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('reportId', reportId);
      fd.set('action', action);
      fd.set('note', action === 'takedown' ? 'Listing taken down by admin' : 'Report dismissed');
      const res = await handleReport(fd);
      setPending(false);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className={styles.wrap}>
      {error && <div className={styles.error} title={error}>!</div>}
      <div className={styles.row}>
        <button
          type='button'
          className={`${styles.btn} ${styles.danger}`}
          disabled={pending}
          onClick={() => {
            if (!confirm('Take down this listing? It will be removed from public browse.')) return;
            run('takedown');
          }}
        >
          <Ban size={12} /> <span className={styles.label}>Takedown</span>
        </button>
        <button
          type='button'
          className={styles.btn}
          disabled={pending}
          onClick={() => run('dismiss')}
        >
          <X size={12} /> <span className={styles.label}>Dismiss</span>
        </button>
      </div>
    </div>
  );
}
