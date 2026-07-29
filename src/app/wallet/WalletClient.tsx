'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Wallet,
  Zap,
} from 'lucide-react';

import { rechargeWallet } from './actions';
import { bdPhoneFieldProps, onBdPhoneChange } from '@/lib/phone';
import { useToast } from '@/components/ToastProvider';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MfsProviderSelect, MfsProvider } from '@/components/MfsProviderSelect';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { StatusBadge } from '@/components/ui/StatusBadge';
import s from './wallet.module.css';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  referenceId: string | null;
  createdAt: string | Date;
}

interface Withdrawal {
  id: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  mfsType: string;
  accountNumber: string;
  transferType: string;
  status: string;
  createdAt: string | Date;
}

interface WalletClientProps {
  initialBalance: number;
  initialTransactions: WalletTransaction[];
  totalDeposited: number;
  totalSpent: number;
  recentWithdrawals: Withdrawal[];
  userName?: string;
}

/* ------------------------------------------------------------------ *
 * Transaction metadata — direction + tone per type.
 * amount is signed in the DB (+:credit, −:debit); we render Math.abs() with
 * the direction sign below so debits never show a double negative.
 * ------------------------------------------------------------------ */

type Direction = 'in' | 'out';

function txnMeta(type: string): { label: string; direction: Direction; tone: 'success' | 'info' | 'danger' | 'neutral' } {
  switch (type) {
    case 'RECHARGE':
      return { label: 'Deposit', direction: 'in', tone: 'success' };
    case 'EARNING_CREDIT':
      return { label: 'Earning', direction: 'in', tone: 'info' };
    case 'TUITION_PAYMENT':
      return { label: 'Tuition', direction: 'out', tone: 'danger' };
    case 'WITHDRAWAL':
      return { label: 'Withdrawal', direction: 'out', tone: 'neutral' };
    default:
      return { label: type, direction: 'in', tone: 'neutral' };
  }
}

function formatBDT(n: number): string {
  return Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

export default function WalletClient({
  initialBalance,
  initialTransactions,
  totalDeposited,
  totalSpent,
  recentWithdrawals,
}: WalletClientProps) {
  const { toast } = useToast();

  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState<WalletTransaction[]>(initialTransactions);
  const [withdrawals] = useState<Withdrawal[]>(recentWithdrawals);

  // Form state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfsType, setMfsType] = useState<MfsProvider>('BKASH');
  const [amountVal, setAmountVal] = useState('');

  // Transaction filter
  const [txnFilter, setTxnFilter] = useState<'all' | 'in' | 'out'>('all');

  const filteredTxns = useMemo(() => {
    if (txnFilter === 'all') return transactions;
    return transactions.filter((t) => txnMeta(t.type).direction === txnFilter);
  }, [transactions, txnFilter]);

  const pendingWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.status === 'PENDING'),
    [withdrawals],
  );

  /* ----- handlers --------------------------------------------------------- */

  async function handleRecharge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError('');

    const formData = new FormData(form);
    formData.set('mfsType', mfsType);

    const res = await rechargeWallet(formData);
    if (res?.error) {
      setError(res.error);
    } else if (res?.success && res.newBalance !== undefined) {
      const addedAmount = parseFloat(formData.get('amount') as string);
      setBalance(res.newBalance);
      toast.success(`Deposited ৳${addedAmount.toLocaleString()} BDT successfully.`);

      const newTxn: WalletTransaction = {
        id: `temp-${Date.now()}`,
        amount: addedAmount,
        type: 'RECHARGE',
        description: `Wallet recharge via ${mfsType}`,
        referenceId: (formData.get('transactionId') as string) || null,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTxn, ...prev]);
      setAmountVal('');
      form.reset();
    }
    setLoading(false);
  }

  /* ----- render ----------------------------------------------------------- */

  return (
    <div className={`flex flex-col gap-6 animate-fade-in w-full ${s.wrap}`}>
      {/* ---------- Header ---------- */}
      <header>
        <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-1)' }}>Campus Wallet</h1>
        <p style={{ color: 'var(--text-muted)', maxWidth: '42rem', margin: 0 }}>
          Top up your balance, track tuition payments, and monitor withdrawals — all in one place.
        </p>
      </header>

      {/* ---------- Balance hero + KPIs ---------- */}
      <section
        className={s.balanceHero}
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderTop: '4px solid var(--primary)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className={s.balanceMain}>
          <span className={s.balanceLabel}>Available Balance</span>
          <div className={s.balanceValue}>
            <span aria-hidden="true">৳</span>
            <span>{formatBDT(balance)}</span>
            <span className={s.currency}>BDT</span>
          </div>
          <p className={s.balanceHint}>
            Use it for instant tuition payments or request a withdrawal to your MFS account.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-primary-light text-primary flex items-center justify-center self-start sm:self-auto" style={{ flexShrink: 0 }}>
          <Wallet size={32} aria-hidden="true" />
        </div>
      </section>

      <div
        className={s.kpiRow}
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className={s.kpiLabel}>
            <ArrowDownLeft size={14} aria-hidden="true" /> Total Deposited
          </div>
          <div className={`${s.kpiValue} text-success-hover`}>৳{formatBDT(totalDeposited)}</div>
        </div>
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <div className={s.kpiLabel}>
            <ArrowUpRight size={14} aria-hidden="true" /> Total Spent (Tuition)
          </div>
          <div className={`${s.kpiValue} text-danger-hover`}>৳{formatBDT(totalSpent)}</div>
        </div>
        {pendingWithdrawals.length > 0 && (
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div className={s.kpiLabel}>
              <Clock size={14} aria-hidden="true" /> Pending Withdrawal{pendingWithdrawals.length > 1 ? 's' : ''}
            </div>
            <div className={s.kpiValue}>
              ৳{formatBDT(pendingWithdrawals.reduce((s2, w) => s2 + w.amount, 0))}
            </div>
            <div className={s.kpiSub}>{pendingWithdrawals.length} awaiting review</div>
          </div>
        )}
      </div>

      {/* ---------- Withdrawal activity (tutors) ---------- */}
      {withdrawals.length > 0 && (
        <section className="card" style={{ padding: 'var(--space-6)' }}>
          <div className={s.sectionHead}>
            <div className={s.sectionTitle}>
              <Clock size={18} aria-hidden="true" /> Withdrawal Activity
            </div>
            <Link href="/tutor/earnings" className="btn-outline btn-sm">
              Request withdrawal
            </Link>
          </div>
          <ul className={s.withdrawalList}>
            {withdrawals.map((w) => (
              <li key={w.id} className={s.withdrawalRow}>
                <div className={s.withdrawalInfo}>
                  <span className={s.withdrawalAmount}>
                    ৳{formatBDT(w.amount)} <span className={s.muted}>· net ৳{formatBDT(w.netAmount)}</span>
                  </span>
                  <span className={s.withdrawalMeta}>
                    {w.mfsType} · ••••{w.accountNumber.slice(-4)} · {w.transferType.replace('_', ' ').toLowerCase()} · {formatDate(w.createdAt)}
                  </span>
                </div>
                <StatusBadge status={w.status} domain="withdrawal" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Deposit + Transactions ---------- */}
      <div className={s.twoCol}>
        {/* LEFT: Deposit form */}
        <div className={`card ${s.depositCol}`}>
          <div className={s.formHead}>
            <Zap size={20} aria-hidden="true" className="text-primary" />
            <h2 className={s.formTitle}>Deposit Funds</h2>
          </div>
          <p className={s.formSub}>
            Choose your MFS provider, enter the amount and transaction ID to top up your balance.
          </p>

          {error && <FormAlert>{error}</FormAlert>}

          <form onSubmit={handleRecharge} className="flex flex-col" style={{ gap: 'var(--space-5)' }}>
            {/* MFS provider */}
            <div>
              <label className={s.fieldLabel}>Select MFS Provider</label>
              <MfsProviderSelect value={mfsType} onChange={setMfsType} idPrefix="wallet-mfs" />
            </div>

            {/* Amount */}
            <div className="flex flex-col" style={{ gap: 'var(--space-2)' }}>
              <label className={s.fieldLabel} htmlFor="wallet-amount">
                Deposit Amount (Min 50 BDT)
              </label>
              <div style={{ position: 'relative' }}>
                <span className={s.amountPrefix} aria-hidden="true">৳</span>
                <input
                  id="wallet-amount"
                  name="amount"
                  type="number"
                  step="any"
                  min="50"
                  required
                  value={amountVal}
                  onChange={(e) => setAmountVal(e.target.value)}
                  placeholder="e.g. 500 or 1000"
                  className={`form-input ${s.amountInput}`}
                />
              </div>
            </div>

            {/* MFS verification fields */}
            <div className={s.verifyGrid}>
              <Input
                containerClassName={fieldClass}
                name="accountNumber"
                {...bdPhoneFieldProps}
                required
                label="Your MFS Number"
                onChange={onBdPhoneChange()}
              />
              <Input
                containerClassName={fieldClass}
                name="transactionId"
                type="text"
                required
                label="Transaction ID (TrxID)"
                placeholder="e.g. 9J8H7G6F21"
              />
            </div>

            <FormSubmit loading={loading} loadingText="Processing Deposit…" icon={<CheckCircle2 size={18} />}>
              Confirm Deposit
            </FormSubmit>
          </form>
        </div>

        {/* RIGHT: Transaction history */}
        <div className={`card ${s.historyCol}`}>
          <div className={s.historyHead}>
            <div className={s.sectionTitle}>
              <Wallet size={18} aria-hidden="true" /> Transaction History
            </div>
            <Badge tone="neutral">{transactions.length} total</Badge>
          </div>

          {/* Filter chips */}
          {transactions.length > 0 && (
            <div className={s.filterRow} role="group" aria-label="Filter transactions">
              {(['all', 'in', 'out'] as const).map((f) => (
                <label key={f} className={s.filterChip}>
                  <input
                    type="radio"
                    name="txnfilter"
                    value={f}
                    checked={txnFilter === f}
                    onChange={() => setTxnFilter(f)}
                    className="sr-only"
                  />
                  <span>{f === 'all' ? 'All' : f === 'in' ? 'Money In' : 'Money Out'}</span>
                </label>
              ))}
            </div>
          )}

          {transactions.length === 0 ? (
            <div className={s.historyEmpty}>
              <Wallet size={36} aria-hidden="true" />
              <p className={s.emptyTitle}>No transactions yet</p>
              <p className={s.emptySub}>Your deposits and tuition payments will appear here.</p>
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className={s.historyEmpty}>
              <p className={s.emptyTitle}>No {txnFilter === 'in' ? 'credits' : 'debits'} to show</p>
              <p className={s.emptySub}>Try a different filter.</p>
            </div>
          ) : (
            <ul className={s.txnList}>
              {filteredTxns.map((txn) => {
                const meta = txnMeta(txn.type);
                const isIn = meta.direction === 'in';
                return (
                  <li key={txn.id} className={s.txnRow}>
                    <span
                      className={isIn ? s.txnIconIn : s.txnIconOut}
                      aria-hidden="true"
                    >
                      {isIn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </span>
                    <div className={s.txnBody}>
                      <span className={s.txnDesc}>{txn.description}</span>
                      <span className={s.txnMetaRow}>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className={s.txnDate}>{formatDate(txn.createdAt)}</span>
                      </span>
                    </div>
                    <span
                      className={isIn ? s.txnAmountIn : s.txnAmountOut}
                      title={isIn ? 'Credit' : 'Debit'}
                    >
                      {isIn ? '+' : '−'}৳{formatBDT(txn.amount)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
