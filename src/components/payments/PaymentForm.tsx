'use client';

import { useState, useTransition, useEffect } from 'react';
import { submitPayment } from '@/app/(member)/student/actions';
import { useToast } from '@/components/ToastProvider';
import { MfsProviderSelect, MFS_LABEL } from '@/components/MfsProviderSelect';
import { Input } from '@/components/ui/Input';
import { fieldClass } from '@/components/forms';
import { bdPhoneFieldProps, onBdPhoneChange } from '@/lib/phone';

// Default fee values — used until /api/settings/fees responds. Mirror the
// schema defaults so first paint matches the canonical numbers.
const DEFAULT_PAYMENT_FEE_PERCENT = 10;
const DEFAULT_PROMO_PERCENT = 50;

// Shape of the optimistic payment record handed back to the parent so it can
// update its own list without waiting for revalidation.
export interface PaymentResult {
  mfsType: string;
  accountNumber: string;
  amount: number;
  transactionId: string;
}

interface PaymentFormProps {
  requestId: string;
  budget: number;
  userBalance: number;
  onCancel: () => void;
  onPaid: (newStatus: 'PAYMENT_PENDING' | 'ACCEPTED', payment: PaymentResult) => void;
}

// Shared MFS payment form. Extracted from StudentRequestList so both the
// dashboard "Recent Requests" list and the payments page "Pending Payments"
// section use one source of truth for the payment procedure.
// The visible total derives from /api/settings/fees (paymentFeePercent +
// promoDiscountPercent). Falls back to 10%/50% (effective 5%) on first paint.
export default function PaymentForm({
  requestId,
  budget,
  userBalance = 0,
  onCancel,
  onPaid,
}: PaymentFormProps) {
  const [mfsType, setMfsType] = useState<'BKASH' | 'NAGAD' | 'ROCKET'>('BKASH');
  const [accountNumber, setAccountNumber] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [payMethod, setPayMethod] = useState<'WALLET' | 'MFS'>('MFS');
  const [couponCode, setCouponCode] = useState('');

  // Wallet chosen via the radio cards above. Derived (not stored) so the
  // submit logic below stays unchanged.
  const useWallet = payMethod === 'WALLET';

  // Fee config — fetched from /api/settings/fees so admins can change
  // rates without code changes. Falls back to the schema defaults during
  // the first paint / if the fetch fails.
  const [paymentFeePercent, setPaymentFeePercent] = useState(DEFAULT_PAYMENT_FEE_PERCENT);
  const [promoPercent, setPromoPercent] = useState(DEFAULT_PROMO_PERCENT);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings/fees')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.paymentFeePercent === 'number') setPaymentFeePercent(data.paymentFeePercent);
        if (typeof data.promoDiscountPercent === 'number') setPromoPercent(data.promoDiscountPercent);
      })
      .catch(() => {
        /* fall back to defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Effective fee multiplier: 1 + (paymentFee% * (1 - promo%)).
  // e.g. paymentFee=10%, promo=50% → 1 + (0.10 * 0.50) = 1.05.
  const feeMultiplier = 1 + (paymentFeePercent / 100) * (1 - promoPercent / 100);
  const totalPayable = parseFloat((budget * feeMultiplier).toFixed(2));
  const baseFee = parseFloat((budget * (paymentFeePercent / 100)).toFixed(2));
  const promoCut = parseFloat((baseFee * (promoPercent / 100)).toFixed(2));

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const walletCovered = useWallet ? Math.min(userBalance, totalPayable) : 0;
    const remainingMfs = parseFloat(Math.max(0, totalPayable - walletCovered).toFixed(2));

    const formData = new FormData();
    formData.append('requestId', requestId);
    if (couponCode.trim()) {
      formData.append('couponCode', couponCode.trim());
    }
    if (walletCovered > 0) {
      formData.append('walletAmount', walletCovered.toString());
    }

    if (remainingMfs === 0) {
      // 100% Wallet payment
      formData.append('mfsType', 'CAMPUS_WALLET');
      formData.append('accountNumber', 'WALLET');
      formData.append('amount', '0');
      formData.append('transactionId', `WLT-${Date.now()}`);
    } else {
      if (!mfsType || !accountNumber || !transactionId) {
        toast.error('Please fill in all bKash / Nagad / Rocket payment details for the remaining balance.');
        return;
      }
      if (accountNumber.length !== 11) {
        toast.error('Your bKash / Nagad / Rocket number must be exactly 11 digits.');
        return;
      }
      formData.append('mfsType', mfsType);
      formData.append('accountNumber', accountNumber);
      formData.append('amount', remainingMfs.toString());
      formData.append('transactionId', transactionId);
    }

    startTransition(async () => {
      const res = await submitPayment(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        const newStatus = remainingMfs === 0 ? 'ACCEPTED' : 'PAYMENT_PENDING';
        const baseMsg = remainingMfs === 0
          ? 'Paid 100% with Campus Wallet! Session is automatically verified & active.'
          : 'Payment details submitted! Verification pending.';
        toast.success(res.couponDiscount ? `${baseMsg} ${res.couponDiscount}` : baseMsg);
        onPaid(newStatus, {
          mfsType:
            remainingMfs === 0
              ? 'CAMPUS_WALLET'
              : walletCovered > 0
                ? `${mfsType} + WALLET`
                : mfsType,
          accountNumber: remainingMfs === 0 ? 'WALLET' : accountNumber,
          amount: totalPayable,
          transactionId: remainingMfs === 0 ? 'WALLET' : transactionId,
        });
        setAccountNumber('');
        setTransactionId('');
        setPayMethod('MFS');
        setCouponCode('');
      }
    });
  };

  return (
    <form
      onSubmit={handlePaymentSubmit}
      style={{
        marginTop: '1rem',
        borderTop: '1px solid var(--border-color)',
        paddingTop: '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
      }}
    >
      <h4 style={{ margin: 0 }}>Complete Your Payment</h4>

      {/* Breakdown section */}
      <div
        style={{
          background: 'var(--surface-1)',
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color)',
          fontSize: '0.9rem',
        }}
      >
        <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.4rem 0' }}>
          <span>Base Tuition Fee:</span>
          <span>{budget} BDT</span>
        </p>
        <p
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            margin: '0 0 0.4rem 0',
            color: 'var(--text-muted)',
          }}
        >
          <span>Platform Fee ({paymentFeePercent}%):</span>
          <span>+{baseFee.toFixed(2)} BDT</span>
        </p>
        <p
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            margin: '0 0 0.4rem 0',
            color: 'var(--success)',
          }}
        >
          <span>Promo Discount (-{promoPercent}%):</span>
          <span>-{promoCut.toFixed(2)} BDT</span>
        </p>
        <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
        <p
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            margin: 0,
            fontWeight: 700,
            fontSize: '0.95rem',
            color: 'var(--text-main)',
          }}
        >
          <span>Total Payable (including {(paymentFeePercent * (1 - promoPercent / 100)).toFixed(1)}% Platform Fee):</span>
          <span>{totalPayable.toFixed(2)} BDT</span>
        </p>
      </div>

      {/* Coupon (TUITION scope, optional) — applied as cashback after payment */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.5rem', alignItems: 'end' }}>
        <Input
          containerClassName={fieldClass}
          name="couponCode"
          type="text"
          label="Coupon Code (optional)"
          placeholder="e.g. WELCOME50"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value)}
        />
      </div>

      {/* ---------- How would you like to pay? ---------- */}
      <div>
        <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Pay with your Campus Wallet, or pay with bKash / Nagad / Rocket — select one to continue.
        </p>
        <div
          role="radiogroup"
          aria-label="Payment method"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}
        >
          {/* Campus Wallet option */}
          <button
            type="button"
            role="radio"
            aria-checked={payMethod === 'WALLET'}
            disabled={userBalance <= 0}
            onClick={() => setPayMethod('WALLET')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.15rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              cursor: userBalance <= 0 ? 'not-allowed' : 'pointer',
              opacity: userBalance <= 0 ? 0.55 : 1,
              border:
                payMethod === 'WALLET'
                  ? '2px solid var(--success-hover)'
                  : '1px solid var(--border-color)',
              background: payMethod === 'WALLET' ? 'var(--success-light)' : 'var(--card-bg)',
              color: 'var(--text-main)',
              textAlign: 'left',
              font: 'inherit',
            }}
          >
            <span style={{ fontWeight: 700, color: payMethod === 'WALLET' ? 'var(--success-hover)' : 'inherit' }}>
              Campus Wallet
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              {userBalance > 0
                ? `${userBalance.toFixed(2)} BDT available — instant verification`
                : 'No balance — top up your wallet first'}
            </span>
          </button>

          {/* bKash / Nagad / Rocket option */}
          <button
            type="button"
            role="radio"
            aria-checked={payMethod === 'MFS'}
            onClick={() => setPayMethod('MFS')}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '0.15rem',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              border:
                payMethod === 'MFS'
                  ? '2px solid var(--accent-hover)'
                  : '1px solid var(--border-color)',
              background: payMethod === 'MFS' ? 'var(--accent-light)' : 'var(--card-bg)',
              color: 'var(--text-main)',
              textAlign: 'left',
              font: 'inherit',
            }}
          >
            <span style={{ fontWeight: 700, color: payMethod === 'MFS' ? 'var(--accent-hover)' : 'inherit' }}>
              bKash / Nagad / Rocket
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Send Money + TrxID — verified by admin
            </span>
          </button>
        </div>
      </div>

      {/* Wallet details — only when that option is selected */}
      {payMethod === 'WALLET' && (
        <div
          style={{
            backgroundColor: 'var(--success-light)',
            border: '1px solid var(--success)',
            padding: '1rem',
            borderRadius: '8px',
            fontSize: '0.9rem',
            color: 'var(--success-hover)',
          }}
        >
          {userBalance >= totalPayable ? (
            <span>
              Your wallet covers 100% of this tuition!{' '}
              <strong>No bKash / Nagad / Rocket payment needed.</strong>
            </span>
          ) : (
            <span>
              Wallet covers -{userBalance.toFixed(2)} BDT. You will pay the remaining{' '}
              <strong>{(totalPayable - userBalance).toFixed(2)} BDT</strong> with bKash / Nagad / Rocket below.
            </span>
          )}
        </div>
      )}

      {!useWallet || userBalance < totalPayable ? (
        <>
          <div
            style={{ backgroundColor: 'var(--accent-light)', border: '1px solid var(--accent)', padding: '1.25rem', borderRadius: '8px' }}
          >
            <p style={{ fontSize: '1.05rem', color: 'var(--accent-hover)', margin: 0, fontWeight: 600 }}>
              Step 1: Send Money to{' '}
              <span
                onClick={() => {
                  navigator.clipboard.writeText('01785872142');
                  toast.success('Number copied to clipboard!');
                }}
                title="Click to copy"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 18%, var(--card-bg))',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '1.2rem',
                  fontWeight: 800,
                  color: 'var(--accent-hover)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  margin: '0 0.25rem',
                  border: '1px solid var(--accent)',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 32%, var(--card-bg))')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 18%, var(--card-bg))')}
              >
                01785872142
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </span>{' '}
              (bKash, Nagad, or Rocket)
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--accent-hover)', margin: '0.5rem 0 0 0' }}>
              Step 2: Choose your service below and submit the transaction details for{' '}
              {useWallet ? (totalPayable - userBalance).toFixed(2) : totalPayable.toFixed(2)} BDT.
            </p>
          </div>

          {/* MFS Providers — shared MfsProviderSelect component */}
          <MfsProviderSelect value={mfsType} onChange={setMfsType} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.75rem',
            }}
          >
            <Input
              containerClassName={fieldClass}
              id={`account-${requestId}`}
              {...bdPhoneFieldProps}
              label={`Your ${MFS_LABEL[mfsType]} Number`}
              hint="The number you sent money from"
              required
              value={accountNumber}
              onChange={onBdPhoneChange((e) => setAccountNumber(e.target.value))}
            />
            <Input
              containerClassName={fieldClass}
              id={`amount-${requestId}`}
              type="number"
              label="Amount (BDT)"
              required
              readOnly
              value={
                useWallet
                  ? (totalPayable - Math.min(userBalance, totalPayable)).toFixed(2)
                  : totalPayable.toFixed(2)
              }
            />
            <Input
              containerClassName={fieldClass}
              id={`txn-${requestId}`}
              type="text"
              label="Transaction ID (TrxID)"
              hint={`The TrxID from your ${MFS_LABEL[mfsType]} confirmation SMS`}
              required
              placeholder="e.g. TRX847927"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div
          style={{
            backgroundColor: 'var(--success-light)',
            border: '1px solid var(--success)',
            padding: '1.25rem',
            borderRadius: '8px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '1.1rem', color: 'var(--success-hover)', margin: 0, fontWeight: 700 }}>
            100% Wallet Payment Ready!
          </p>
          <p style={{ fontSize: '0.9rem', color: 'var(--success-hover)', margin: '0.5rem 0 0 0' }}>
            Click the button below to deduct {totalPayable.toFixed(2)} BDT from your Campus Wallet
            and activate this tutoring session instantly.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={() => {
            onCancel();
            setPayMethod('MFS');
          }}
          className="btn"
          style={{ padding: '0.5rem 1rem', background: 'var(--surface-3)', color: 'var(--text-main)', borderRadius: '6px' }}
        >
          Cancel
        </button>
        <button type="submit" disabled={isPending} className="btn-primary" style={{ padding: '0.5rem 1.25rem' }}>
          {isPending
            ? 'Submitting...'
            : useWallet && userBalance >= totalPayable
              ? 'Pay with Wallet (1-Click Verify)'
              : 'Submit Payment'}
        </button>
      </div>
    </form>
  );
}
