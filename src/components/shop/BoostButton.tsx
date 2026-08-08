'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Zap, Sparkles, ShieldCheck, Wallet, ArrowRight } from 'lucide-react';
import { boostListing } from '@/app/(member)/shop/boost/actions';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
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
  const { confirm, dialog } = useConfirmDialog();

  const isBoosted = boostedUntil ? new Date(boostedUntil) > new Date() : false;

  // Detect insufficient-balance errors so we can show a richer card with a
  // recharge CTA instead of a bare string. The server action returns a
  // human-readable message — matching on "Insufficient wallet balance" is
  // stable enough for this UI hint (it's set in policy.ts → canBuy).
  const isInsufficientBalance = /insufficient wallet balance/i.test(error);

  async function handleBoost() {
    setError('');
    setSuccess('');

    const ok = await confirm({
      title: isBoosted ? 'Extend your boost?' : `Boost for ${boostDays} days?`,
      description: (
        <div>
          <p style={{ margin: '0 0 0.75rem' }}>
            Your listing <strong>&ldquo;{listingTitle}&rdquo;</strong> will sort
            above non-boosted items in browse results and show a transparent{' '}
            <strong>Boosted</strong> badge.
          </p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '0.5rem 1rem',
              padding: '0.75rem 1rem',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
              marginTop: '0.5rem',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Cost</span>
            <strong style={{ textAlign: 'right' }}>
              {formatBDT(boostFeeBdt)}
            </strong>
            <span style={{ color: 'var(--text-muted)' }}>Duration</span>
            <strong style={{ textAlign: 'right' }}>{boostDays} days</strong>
            <span style={{ color: 'var(--text-muted)' }}>Charged to</span>
            <strong style={{ textAlign: 'right' }}>Your wallet</strong>
          </div>
          <p
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.75rem',
              marginBottom: 0,
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
            }}
          >
            <ShieldCheck size={12} aria-hidden='true' />
            Debited instantly. Listing stays free to relist after the boost ends.
          </p>
        </div>
      ),
      confirmLabel: `Boost — ${formatBDT(boostFeeBdt)}`,
      tone: 'primary',
    });

    if (!ok) return;

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
      {error && isInsufficientBalance && (
        <div role='alert' className={styles.balanceCard}>
          <div className={styles.balanceCardIcon}>
            <Wallet size={18} aria-hidden='true' />
          </div>
          <div className={styles.balanceCardBody}>
            <strong>Your wallet needs a top-up</strong>
            <p>
              Boost costs <strong>{formatBDT(boostFeeBdt)}</strong>. Recharge
              your wallet and come back — your listing stays active in the
              meantime.
            </p>
          </div>
          <Link href='/wallet' className={styles.rechargeLink}>
            Recharge <ArrowRight size={12} aria-hidden='true' />
          </Link>
        </div>
      )}
      {error && !isInsufficientBalance && (
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
      {dialog}
    </div>
  );
}
