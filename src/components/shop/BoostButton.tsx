'use client';

import { useState, useTransition } from 'react';
import { Zap, Sparkles } from 'lucide-react';
import { boostListing } from '@/app/(marketing)/shop/boost/actions';
import { formatBDT } from '@/lib/shop/service';
import styles from './BoostButton.module.css';

interface Props {
  listingId: string;
  listingTitle: string;
  boostFeeBdt: number;
  boostDays: number;
  boostedUntil?: string | null;
}

export default function BoostButton({
  listingId,
  listingTitle,
  boostFeeBdt,
  boostDays,
  boostedUntil,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [, startTransition] = useTransition();

  const isBoosted = boostedUntil ? new Date(boostedUntil) > new Date() : false;

  function handleBoost() {
    setError('');
    setSuccess('');
    if (
      !confirm(
        `Boost "${listingTitle}" for ${boostDays} days?\n\nCost: ${formatBDT(
          boostFeeBdt,
        )} — debited from your wallet instantly. Your listing stays pinned at the top of browse for the duration.`,
      )
    ) {
      return;
    }
    setLoading(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listingId', listingId);
      const res = await boostListing(fd);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess('Boosted! Your listing is now pinned at the top of browse.');
    });
  }

  return (
    <div className={styles.wrap}>
      {isBoosted && (
        <div className={styles.boostedPill}>
          <Sparkles size={12} aria-hidden='true' />
          <span>Boosted until {new Date(boostedUntil!).toLocaleDateString()}</span>
        </div>
      )}
      {error && (
        <div role='alert' className={styles.error}>
          {error}
        </div>
      )}
      {success && (
        <div role='status' className={styles.success}>
          {success}
        </div>
      )}
      <button
        type='button'
        className={styles.btn}
        onClick={handleBoost}
        disabled={loading}
      >
        <Zap size={14} aria-hidden='true' />
        {loading
          ? 'Boosting…'
          : isBoosted
            ? `Extend boost (${formatBDT(boostFeeBdt)})`
            : `Boost for ${boostDays} days — ${formatBDT(boostFeeBdt)}`}
      </button>
      <p className={styles.help}>
        Boosted listings sort above non-boosted in browse results, with a
        transparent &ldquo;Boosted&rdquo; badge. Listings are still free to
        list — Boost is an optional visibility upgrade.
      </p>
    </div>
  );
}
