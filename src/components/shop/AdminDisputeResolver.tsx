'use client';

import { useState, useTransition } from 'react';
import { resolveDispute } from '@/app/(member)/shop/disputes/actions';
import styles from './AdminDisputeResolver.module.css';

interface Props {
  disputeId: string;
  sellerAlreadyPaid: boolean;
}

export default function AdminDisputeResolver({ disputeId, sellerAlreadyPaid }: Props) {
  const [resolution, setResolution] = useState<'buyer' | 'seller'>('buyer');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (note.trim().length < 10) {
      setError('Provide a clear note (at least 10 characters) — it will be visible to both parties.');
      return;
    }
    if (!confirm(`Resolve in favour of the ${resolution}? This cannot be undone.`)) return;
    setLoading(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('disputeId', disputeId);
      fd.set('resolution', resolution);
      fd.set('note', note.trim());
      const res = await resolveDispute(fd);
      setLoading(false);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <h3 className={styles.heading}>Resolve this issue</h3>

      {sellerAlreadyPaid && (
        <div className={styles.warn}>
          ⚠️ The seller has already been paid. Resolving here records the
          verdict but does not claw back funds — coordinate any refund
          offline (wallet adjustment or manual reversal).
        </div>
      )}

      {error && <div role='alert' className={styles.error}>{error}</div>}

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Decision</legend>
        <label className={styles.radioRow}>
          <input
            type='radio'
            name='resolution'
            value='buyer'
            checked={resolution === 'buyer'}
            onChange={() => setResolution('buyer')}
            disabled={loading}
          />
          <span>
            <strong>Refund buyer</strong>
            <span className={styles.radioHint}>
              {!sellerAlreadyPaid
                ? 'Returns the full escrowed subtotal to the buyer. No commission captured.'
                : 'Records the verdict; buyer must be refunded manually.'}
            </span>
          </span>
        </label>
        <label className={styles.radioRow}>
          <input
            type='radio'
            name='resolution'
            value='seller'
            checked={resolution === 'seller'}
            onChange={() => setResolution('seller')}
            disabled={loading}
          />
          <span>
            <strong>Pay seller</strong>
            <span className={styles.radioHint}>
              {!sellerAlreadyPaid
                ? 'Releases the escrowed payout + captures platform commission.'
                : 'Records the verdict; no additional action needed.'}
            </span>
          </span>
        </label>
      </fieldset>

      <label className={styles.label} htmlFor='note'>
        Admin note
      </label>
      <textarea
        id='note'
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={1000}
        placeholder='Explain the decision — visible to both parties and stored on the order timeline.'
        className={styles.textarea}
        disabled={loading}
      />

      <button type='submit' className={styles.submit} disabled={loading}>
        {loading ? 'Resolving…' : `Resolve for ${resolution}`}
      </button>
    </form>
  );
}
