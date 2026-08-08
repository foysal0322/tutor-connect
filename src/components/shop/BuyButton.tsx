'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ShieldCheck, Lock } from 'lucide-react';
import { placeOrder } from '@/app/(member)/shop/orders/actions';
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

  function handleBuy() {
    setError('');
    if (!hasFunds) {
      setError(
        `Insufficient wallet balance. Recharge your wallet and come back.`,
      );
      return;
    }
    if (
      !confirm(
        `Buy ${qty} × ${formatBDT(priceBdt)} = ${formatBDT(
          total,
        )}?\nFunds will be held in escrow until you confirm delivery.`,
      )
    ) {
      return;
    }
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
        <span>
          Funds released to seller only after you confirm delivery.
        </span>
      </div>
    </div>
  );
}
