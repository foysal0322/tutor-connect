'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Lock, Wallet } from 'lucide-react';
import { placeOrder } from '@/app/(member)/shop/orders/actions';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatBDT } from '@/lib/shop/service';
import styles from './BuyButton.module.css';

interface Props {
  listingId: string;
  priceBdt: number;
  quantity: number;
  isSoldOut: boolean;
  isOwner: boolean;
  isSignedIn: boolean;
  isVerified: boolean;
  viewerBalance: number | null;
}

export default function BuyButton({
  listingId,
  priceBdt,
  quantity,
  isSoldOut,
  isOwner,
  isSignedIn,
  isVerified,
  viewerBalance,
}: Props) {
  const router = useRouter();
  const [qty, setQty] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [, startTransition] = useTransition();
  const { confirm, dialog } = useConfirmDialog();

  if (!isSignedIn) {
    return (
      <Link href='/auth/signin' className={`${styles.btn} ${styles.btnPrimary}`}>
        Sign in to buy
      </Link>
    );
  }

  if (isOwner) {
    return (
      <button type='button' className={styles.btn} disabled>
        This is your listing
      </button>
    );
  }

  if (isSoldOut) {
    return (
      <button type='button' className={styles.btn} disabled>
        Sold out
      </button>
    );
  }

  if (!isVerified) {
    return (
      <button type='button' className={styles.btn} disabled>
        Verify your email to buy
      </button>
    );
  }

  const total = priceBdt * qty;
  const hasFunds = viewerBalance == null ? false : viewerBalance >= total;
  const balanceAfter = viewerBalance == null ? null : viewerBalance - total;

  async function handleBuy() {
    setError('');
    if (!hasFunds) {
      setError(`Insufficient wallet balance. Recharge your wallet and come back.`);
      return;
    }

    const ok = await confirm({
      title: 'Confirm your purchase',
      description: (
        <div>
          {/* Order summary card */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '0.5rem 1rem',
              padding: '0.875rem 1rem',
              background: 'var(--surface-2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-sm)',
            }}
          >
            <span style={{ color: 'var(--text-muted)' }}>Item price</span>
            <strong style={{ textAlign: 'right' }}>
              {formatBDT(priceBdt)}
            </strong>
            {qty > 1 && (
              <>
                <span style={{ color: 'var(--text-muted)' }}>Quantity</span>
                <strong style={{ textAlign: 'right' }}>× {qty}</strong>
              </>
            )}
            <span
              style={{
                color: 'var(--text-muted)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.5rem',
                marginTop: '0.25rem',
              }}
            >
              Total
            </span>
            <strong
              style={{
                textAlign: 'right',
                fontSize: 'var(--text-lg)',
                color: 'var(--primary)',
                borderTop: '1px solid var(--border-color)',
                paddingTop: '0.5rem',
                marginTop: '0.25rem',
              }}
            >
              {formatBDT(total)}
            </strong>
          </div>

          {/* Wallet impact row */}
          {balanceAfter != null && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginTop: '0.75rem',
                padding: '0.5rem 0.75rem',
                background:
                  'var(--info-bg, color-mix(in srgb, var(--info) 8%, transparent))',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-main)',
              }}
            >
              <Wallet size={14} aria-hidden='true' style={{ color: 'var(--info)' }} />
              <span>
                Wallet after purchase:{' '}
                <strong>{formatBDT(balanceAfter)}</strong>
              </span>
            </div>
          )}

          {/* Trust note */}
          <p
            style={{
              display: 'inline-flex',
              alignItems: 'flex-start',
              gap: '0.4rem',
              marginTop: '0.75rem',
              marginBottom: 0,
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              lineHeight: 1.5,
            }}
          >
            <ShieldCheck
              size={14}
              aria-hidden='true'
              style={{ flexShrink: 0, marginTop: 1, color: 'var(--success)' }}
            />
            <span>
              Funds are held in <strong>escrow</strong> — the seller is paid
              only after you confirm delivery. You can cancel for a full refund
              any time before shipping.
            </span>
          </p>
        </div>
      ),
      confirmLabel: `Place order — ${formatBDT(total)}`,
      tone: 'primary',
    });

    if (!ok) return;

    setLoading(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listingId', listingId);
      fd.set('quantity', String(qty));
      const res = await placeOrder(fd);
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (res.orderId) {
        router.push(`/shop/orders/${res.orderId}`);
      } else {
        router.push('/shop/orders');
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.wrap}>
      {error && (
        <div role='alert' className={styles.error}>
          {error}
          {!hasFunds && (
            <Link href='/wallet' className={styles.rechargeLink}>
              Recharge wallet →
            </Link>
          )}
        </div>
      )}

      {quantity > 1 && (
        <div className={styles.qtyRow}>
          <label htmlFor='qty' className={styles.qtyLabel}>
            Quantity
          </label>
          <input
            id='qty'
            type='number'
            min={1}
            max={quantity}
            value={qty}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (Number.isFinite(n) && n >= 1 && n <= quantity) {
                setQty(Math.floor(n));
              }
            }}
            className={styles.qtyInput}
          />
        </div>
      )}

      <div className={styles.totalRow}>
        <span>Total</span>
        <strong>{formatBDT(total)}</strong>
      </div>

      <button
        type='button'
        className={`${styles.btn} ${styles.btnPrimary}`}
        onClick={handleBuy}
        disabled={loading}
      >
        {loading ? (
          'Placing order…'
        ) : (
          <>
            <Lock size={14} aria-hidden='true' />
            Buy with escrow — {formatBDT(total)}
          </>
        )}
      </button>

      <div className={styles.fineprint}>
        <ShieldCheck size={12} aria-hidden='true' />
        <span>Funds released to seller only after you confirm delivery.</span>
      </div>

      {dialog}
    </div>
  );
}
