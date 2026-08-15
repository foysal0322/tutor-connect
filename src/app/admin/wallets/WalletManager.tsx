'use client';

import { useMemo, useState, useTransition } from 'react';
import {
  Wallet,
  Search,
  Users,
  TrendingUp,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  AlertCircle,
  Plus,
  Minus,
  Clock,
  BadgeCheck,
  XCircle,
} from 'lucide-react';
import { adjustUserBalance, reviewDeposit } from '@/app/actions/admin';
import { useToast } from '@/components/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import LoadingButton from '@/components/ui/LoadingButton';
import { Sheet } from '@/components/ui/Sheet';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { KPI } from '@/components/ui/KPI';
import EmptyState from '@/components/ui/EmptyState';

interface WalletUser {
  id: string;
  name: string;
  nsuId: string;
  email: string;
  role: string;
  balance: number;
  department: { name: string } | null;
}

interface Adjustment {
  id: string;
  amount: number;
  description: string;
  createdAt: string;
  userName: string;
  userNsuId: string;
  adminName: string;
}

interface PendingDeposit {
  id: string;
  amount: number;
  description: string;
  trxId: string | null;
  createdAt: string;
  userName: string;
  userNsuId: string;
}

interface Props {
  users: WalletUser[];
  adjustments: Adjustment[];
  pendingDeposits: PendingDeposit[];
  focusUserId?: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function formatBDT(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function WalletManager({ users, adjustments, pendingDeposits, focusUserId }: Props) {
  const [userList, setUserList] = useState(users);
  const [depositQueue, setDepositQueue] = useState(pendingDeposits);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeUserId, setActiveUserId] = useState<string | null>(focusUserId ?? null);
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 300);

  const REASON_MIN = 10;
  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < REASON_MIN;

  const filteredUsers = useMemo(() => {
    let result = [...userList];
    if (roleFilter) result = result.filter((u) => u.role === roleFilter);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.nsuId.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    result.sort((a, b) => b.balance - a.balance);
    return result;
  }, [userList, debouncedSearch, roleFilter]);

  // KPI derivations (cheap, client-side).
  // `now` is captured once on mount so the 24h count is stable across renders
  // and we don't violate react-hooks/purity by calling Date.now() inside useMemo.
  const [mountedAt] = useState(() => Date.now());
  const totalMembers = userList.length;
  const totalLiability = useMemo(
    () => userList.reduce((s, u) => s + u.balance, 0),
    [userList],
  );
  const adjustments24h = useMemo(
    () =>
      adjustments.filter((a) => mountedAt - new Date(a.createdAt).getTime() < DAY_MS).length,
    [adjustments, mountedAt],
  );
  const avgBalance = totalMembers ? totalLiability / totalMembers : 0;

  const activeUser = userList.find((u) => u.id === activeUserId) ?? null;

  // Approve/reject a pending deposit. The balance credit happens server-side
  // in reviewDeposit; here we just remove the row and toast the outcome.
  const handleReview = (depositId: string, decision: 'APPROVE' | 'REJECT') => {
    const deposit = depositQueue.find((d) => d.id === depositId);
    setReviewingId(depositId);
    setError('');

    const formData = new FormData();
    formData.append('transactionId', depositId);
    formData.append('decision', decision);

    startTransition(async () => {
      const res = await reviewDeposit(formData);
      if (res?.error) {
        toast.error(res.error);
        // Already-reviewed rows should still leave the queue.
        if (res.error.includes('already been reviewed')) {
          setDepositQueue((prev) => prev.filter((d) => d.id !== depositId));
        }
      } else {
        toast.success(
          decision === 'APPROVE'
            ? `Deposit approved — ${formatBDT(deposit?.amount ?? 0)} BDT credited to ${deposit?.userName ?? 'user'}.`
            : `Deposit from ${deposit?.userName ?? 'user'} rejected.`,
        );
        setDepositQueue((prev) => prev.filter((d) => d.id !== depositId));
      }
      setReviewingId(null);
    });
  };

  const resetForm = () => {
    setDirection('CREDIT');
    setAmount('');
    setReason('');
    setError('');
  };

  const openModal = (userId: string) => {
    resetForm();
    setActiveUserId(userId);
  };

  const closeModal = () => {
    setActiveUserId(null);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    setError('');

    // Client-side pre-flight: mirror the server's reasonSchema check so the
    // admin sees the error inside the Sheet (the global toast would render
    // behind the open Sheet drawer and be invisible — that was the bug).
    if (reason.trim().length < REASON_MIN) {
      setError(`Please provide more detail (at least ${REASON_MIN} characters).`);
      return;
    }
    const amountNum = Number(amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setError('Enter a positive amount.');
      return;
    }
    if (direction === 'DEBIT' && amountNum > activeUser.balance) {
      setError(
        `Cannot debit more than the current balance (${formatBDT(activeUser.balance)} BDT).`,
      );
      return;
    }

    const formData = new FormData();
    formData.append('userId', activeUser.id);
    formData.append('direction', direction);
    formData.append('amount', amount);
    formData.append('reason', reason);

    startTransition(async () => {
      const res = await adjustUserBalance(formData);
      if (res?.error) {
        // Inline inside the Sheet, not the global toast (which renders
        // behind the drawer and is invisible to the admin).
        setError(res.error);
      } else {
        const signed = direction === 'CREDIT' ? `+${amount}` : `-${amount}`;
        toast.success(`Wallet adjusted (${signed} BDT). User notified.`);
        setUserList((prev) =>
          prev.map((u) =>
            u.id === activeUser.id ? { ...u, balance: res.newBalance ?? u.balance } : u,
          ),
        );
        closeModal();
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        icon={<Wallet size={18} aria-hidden='true' />}
        title='Wallet Management'
        subtitle='Adjust a member’s wallet balance directly. Every change is recorded in the user’s transaction history with your reason, and the user is notified.'
      />

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <KPI
          label='Members'
          value={totalMembers.toLocaleString()}
          icon={<Users size={16} aria-hidden='true' />}
          tone='info'
          variant='accent'
          hint='Students + tutors'
        />
        <KPI
          label='Total Liability'
          value={`${formatBDT(totalLiability)} BDT`}
          icon={<Wallet size={16} aria-hidden='true' />}
          tone='primary'
          variant='accent'
          hint='Sum of all member balances'
        />
        <KPI
          label='Avg Balance'
          value={`${formatBDT(Math.round(avgBalance))} BDT`}
          icon={<TrendingUp size={16} aria-hidden='true' />}
          tone='accent'
          variant='accent'
          hint='Across active wallets'
        />
        <KPI
          label='Adjustments 24h'
          value={adjustments24h.toLocaleString()}
          icon={<Activity size={16} aria-hidden='true' />}
          tone={adjustments24h > 0 ? 'success' : 'neutral'}
          variant='accent'
          hint='Admin-initiated'
        />
      </div>

      {/* Pending deposit approvals — deposits only credit the balance here. */}
      <section
        className='card'
        style={{ padding: 0, overflow: 'hidden' }}
        aria-label='Pending deposit approvals'
      >
        <header
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--text-main)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <Clock size={16} aria-hidden='true' /> Pending Deposit Approvals
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              Verify the MFS TrxID against your provider statement. Approving credits the wallet;
              nothing is credited until then.
            </p>
          </div>
          {depositQueue.length > 0 && (
            <span
              className='badge badge-primary'
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {depositQueue.length} awaiting review
            </span>
          )}
        </header>

        {depositQueue.length === 0 ? (
          <EmptyState
            icon={<BadgeCheck size={32} aria-hidden='true' />}
            title='No pending deposits'
            description='Member deposit requests will appear here for verification.'
          />
        ) : (
          <div className='data-grid-container'>
            {/* Desktop / tablet */}
            <table className='data-grid' style={{ display: 'table' }}>
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Member</th>
                  <th style={{ width: '12%' }}>Amount</th>
                  <th style={{ width: '24%' }}>Provider / Account</th>
                  <th style={{ width: '16%' }}>TrxID</th>
                  <th style={{ width: '10%' }}>When</th>
                  <th style={{ width: '14%', textAlign: 'right' }}>Review</th>
                </tr>
              </thead>
              <tbody>
                {depositQueue.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{d.userName}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        {d.userNsuId}
                      </div>
                    </td>
                    <td style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>
                      +{formatBDT(d.amount)} BDT
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)' }}>{d.description}</td>
                    <td style={{ fontSize: 'var(--text-sm)', fontVariantNumeric: 'tabular-nums' }}>
                      {d.trxId || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>none</span>}
                    </td>
                    <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(d.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        type='button'
                        onClick={() => handleReview(d.id, 'APPROVE')}
                        disabled={isPending && reviewingId === d.id}
                        style={{
                          border: 'none',
                          background: 'var(--success)',
                          color: 'white',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          marginRight: 6,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <BadgeCheck size={13} aria-hidden='true' /> Approve
                      </button>
                      <button
                        type='button'
                        onClick={() => handleReview(d.id, 'REJECT')}
                        disabled={isPending && reviewingId === d.id}
                        style={{
                          border: '1px solid var(--danger)',
                          background: 'transparent',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <XCircle size={13} aria-hidden='true' /> Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile cards */}
            <div
              className='md:hidden'
              style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-color)' }}
            >
              {depositQueue.map((d) => (
                <div
                  key={d.id}
                  style={{
                    background: 'var(--card-bg)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--text-main)' }}>{d.userName}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.userNsuId}</div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--success)', fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-sm)' }}>
                      +{formatBDT(d.amount)} BDT
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {d.description} · TrxID: {d.trxId || 'none'} ·{' '}
                    {new Date(d.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button
                      type='button'
                      onClick={() => handleReview(d.id, 'APPROVE')}
                      disabled={isPending && reviewingId === d.id}
                      style={{
                        flex: 1,
                        border: 'none',
                        background: 'var(--success)',
                        color: 'white',
                        cursor: 'pointer',
                        padding: '8px 0',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                      }}
                    >
                      Approve
                    </button>
                    <button
                      type='button'
                      onClick={() => handleReview(d.id, 'REJECT')}
                      disabled={isPending && reviewingId === d.id}
                      style={{
                        flex: 1,
                        border: '1px solid var(--danger)',
                        background: 'transparent',
                        color: 'var(--danger)',
                        cursor: 'pointer',
                        padding: '8px 0',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--text-sm)',
                        fontWeight: 700,
                      }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Wallets table */}
      <section
        className='card'
        style={{ padding: 0, overflow: 'hidden' }}
        aria-label='Member wallets'
      >
        <Toolbar
          search={
            <div style={{ position: 'relative', minWidth: 220, flex: 1 }}>
              <Search
                size={16}
                aria-hidden='true'
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                type='text'
                aria-label='Search by name, NSU ID, or email'
                placeholder='Search by name, NSU ID, or email…'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 'calc(var(--space-3) + 20px)',
                  paddingRight: 'var(--space-3)',
                  paddingTop: 'var(--space-2)',
                  paddingBottom: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
            </div>
          }
          filters={
            <div
              role='radiogroup'
              aria-label='Filter by role'
              style={{
                display: 'inline-flex',
                gap: 2,
                background: 'var(--surface-2)',
                padding: 2,
                borderRadius: 'var(--radius-md)',
              }}
            >
              {[
                { value: '', label: 'All' },
                { value: 'STUDENT', label: 'Students' },
                { value: 'TUTOR', label: 'Tutors' },
              ].map((opt) => {
                const active = roleFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type='button'
                    role='radio'
                    aria-checked={active}
                    onClick={() => setRoleFilter(opt.value)}
                    style={{
                      border: 'none',
                      background: active ? 'var(--card-bg)' : 'transparent',
                      color: active ? 'var(--text-main)' : 'var(--text-muted)',
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: 'calc(var(--radius-md) - 2px)',
                      fontSize: 'var(--text-xs)',
                      boxShadow: active ? 'var(--shadow-sm)' : 'none',
                      transition:
                        'background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          }
          actions={
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {filteredUsers.length} shown
            </span>
          }
        />

        {/* Desktop / tablet table */}
        <div className='data-grid-container'>
          <table className='data-grid' style={{ display: 'table' }}>
            <thead>
              <tr>
                <th style={{ width: '32%' }}>Member</th>
                <th style={{ width: '12%' }}>Role</th>
                <th style={{ width: '18%' }}>Department</th>
                <th style={{ width: '18%', textAlign: 'right' }}>Balance</th>
                <th style={{ width: '20%', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                        <span
                          aria-hidden='true'
                          style={{
                            flexShrink: 0,
                            width: 32,
                            height: 32,
                            borderRadius: 'var(--radius-full)',
                            background:
                              u.role === 'TUTOR' ? 'var(--primary-light)' : 'var(--accent-light)',
                            color: u.role === 'TUTOR' ? 'var(--primary)' : 'var(--accent)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          {initials(u.name)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: 'var(--text-main)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {u.name}
                          </div>
                          <div
                            style={{
                              fontSize: 'var(--text-xs)',
                              color: 'var(--text-muted)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {u.nsuId} · {u.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}
                      >
                        {u.role === 'TUTOR' ? 'Tutor' : 'Student'}
                      </span>
                    </td>
                    <td
                      style={{
                        fontSize: 'var(--text-sm)',
                        color: u.department?.name ? 'var(--text-main)' : 'var(--text-muted)',
                        fontStyle: u.department?.name ? 'normal' : 'italic',
                      }}
                    >
                      {u.department?.name || 'N/A'}
                    </td>
                    <td
                      style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        color: u.balance > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                      }}
                    >
                      {formatBDT(u.balance)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>BDT</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type='button'
                        onClick={() => openModal(u.id)}
                        style={{
                          border: '1px solid var(--border-color)',
                          background: 'var(--card-bg)',
                          color: 'var(--text-main)',
                          cursor: 'pointer',
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-md)',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          transition: 'background var(--duration-fast) var(--ease-standard)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--surface-2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--card-bg)';
                        }}
                      >
                        <Plus size={12} aria-hidden='true' />
                        Adjust
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <EmptyState
                      icon={<Search size={32} aria-hidden='true' />}
                      title='No members match your filters'
                      description='Try a different name, NSU ID, or email, or clear the role filter.'
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div
            className='md:hidden'
            style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-color)' }}
          >
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <div
                  key={u.id}
                  style={{
                    background: 'var(--card-bg)',
                    padding: 'var(--space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                  }}
                >
                  <span
                    aria-hidden='true'
                    style={{
                      flexShrink: 0,
                      width: 36,
                      height: 36,
                      borderRadius: 'var(--radius-full)',
                      background:
                        u.role === 'TUTOR' ? 'var(--primary-light)' : 'var(--accent-light)',
                      color: u.role === 'TUTOR' ? 'var(--primary)' : 'var(--accent)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {initials(u.name)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          fontSize: 'var(--text-sm)',
                        }}
                      >
                        {u.name}
                      </span>
                      <span
                        className={`badge ${u.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}
                        style={{ fontSize: 10, padding: '1px 6px' }}
                      >
                        {u.role === 'TUTOR' ? 'Tutor' : 'Student'}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {u.nsuId}
                      {u.department?.name ? ` · ${u.department.name}` : ''}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontWeight: 700,
                        color: u.balance > 0 ? 'var(--text-main)' : 'var(--text-muted)',
                        fontVariantNumeric: 'tabular-nums',
                        fontSize: 'var(--text-base)',
                      }}
                    >
                      {formatBDT(u.balance)} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>BDT</span>
                    </div>
                  </div>
                  <button
                    type='button'
                    onClick={() => openModal(u.id)}
                    aria-label={`Adjust ${u.name}'s wallet`}
                    style={{
                      border: '1px solid var(--border-color)',
                      background: 'var(--card-bg)',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-md)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Plus size={14} aria-hidden='true' />
                  </button>
                </div>
              ))
            ) : (
              <div style={{ background: 'var(--card-bg)' }}>
                <EmptyState
                  icon={<Search size={28} aria-hidden='true' />}
                  title='No matches'
                  description='Try a different search.'
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Recent adjustments audit feed */}
      <section
        className='card'
        style={{ padding: 0, overflow: 'hidden' }}
        aria-label='Recent wallet adjustments'
      >
        <header
          style={{
            padding: 'var(--space-4) var(--space-5)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-3)',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--text-base)',
                fontWeight: 700,
                color: 'var(--text-main)',
              }}
            >
              Recent Adjustments
            </h2>
            <p
              style={{
                margin: '2px 0 0 0',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
              }}
            >
              Last 20 admin-initiated wallet changes. Full history lives in each user’s transaction log.
            </p>
          </div>
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-muted)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {adjustments.length} {adjustments.length === 1 ? 'entry' : 'entries'}
          </span>
        </header>

        <div className='data-grid-container'>
          {adjustments.length === 0 ? (
            <EmptyState
              icon={<Activity size={32} aria-hidden='true' />}
              title='No adjustments yet'
              description='When you adjust a member’s wallet, the audit trail will appear here.'
            />
          ) : (
            <>
              <table className='data-grid' style={{ display: 'table' }}>
                <thead>
                  <tr>
                    <th style={{ width: '24%' }}>User</th>
                    <th style={{ width: '14%' }}>Amount</th>
                    <th style={{ width: '32%' }}>Reason</th>
                    <th style={{ width: '14%' }}>Actioned By</th>
                    <th style={{ width: '16%' }}>When</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => {
                    const isCredit = a.amount >= 0;
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {a.userName}
                          </div>
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                            {a.userNsuId}
                          </div>
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontWeight: 700,
                              fontVariantNumeric: 'tabular-nums',
                              color: isCredit ? 'var(--success)' : 'var(--danger)',
                            }}
                          >
                            {isCredit ? (
                              <ArrowUpCircle size={14} aria-hidden='true' />
                            ) : (
                              <ArrowDownCircle size={14} aria-hidden='true' />
                            )}
                            {isCredit ? '+' : ''}
                            {formatBDT(a.amount)} BDT
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: 'var(--text-main)',
                            maxWidth: 280,
                          }}
                        >
                          <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            “{a.description}”
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--text-sm)' }}>{a.adminName}</td>
                        <td
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--text-muted)',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {new Date(a.createdAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile audit feed */}
              <div
                className='md:hidden'
                style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-color)' }}
              >
                {adjustments.map((a) => {
                  const isCredit = a.amount >= 0;
                  return (
                    <div
                      key={a.id}
                      style={{
                        background: 'var(--card-bg)',
                        padding: 'var(--space-3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 'var(--text-sm)' }}>
                          {a.userName}
                        </span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontWeight: 700,
                            fontVariantNumeric: 'tabular-nums',
                            fontSize: 'var(--text-sm)',
                            color: isCredit ? 'var(--success)' : 'var(--danger)',
                          }}
                        >
                          {isCredit ? (
                            <ArrowUpCircle size={14} aria-hidden='true' />
                          ) : (
                            <ArrowDownCircle size={14} aria-hidden='true' />
                          )}
                          {isCredit ? '+' : ''}
                          {formatBDT(a.amount)}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        “{a.description}”
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {a.adminName} ·{' '}
                        {new Date(a.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Adjust balance sheet (Phase 8: was Modal, now right-side Sheet). */}
      <Sheet
        open={!!activeUser}
        onClose={closeModal}
        title={activeUser ? 'Adjust Wallet' : ''}
        side='right'
        size='30rem'
        footer={
          <>
            <button
              type='button'
              onClick={closeModal}
              className='btn-secondary'
              style={{ padding: '8px 16px', fontSize: 'var(--text-sm)' }}
              disabled={isPending}
            >
              Cancel
            </button>
            <LoadingButton
              type='submit'
              form='adjust-wallet-form'
              loading={isPending}
              loadingText='Saving…'
              variant={direction === 'CREDIT' ? 'primary' : 'danger'}
              style={{ padding: '8px 16px', fontSize: 'var(--text-sm)' }}
            >
              {direction === 'CREDIT' ? 'Credit Wallet' : 'Debit Wallet'}
            </LoadingButton>
          </>
        }
      >
        {activeUser && (
          <form id='adjust-wallet-form' onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            {/* Inline error — rendered INSIDE the Sheet so it's always
                visible. The previous toast.error() fired but rendered behind
                the open Sheet drawer, hiding the error from the admin. */}
            {error && (
              <div
                role='alert'
                aria-live='assertive'
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-2)',
                  padding: 'var(--space-3) var(--space-3)',
                  background:
                    'var(--danger-bg, color-mix(in srgb, var(--danger) 10%, transparent))',
                  color: 'var(--danger)',
                  border: '1px solid var(--danger)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={16} aria-hidden='true' style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{error}</span>
              </div>
            )}

            {/* User + current balance card */}
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontWeight: 600,
                }}
              >
                {activeUser.name} · {activeUser.nsuId}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--space-1)' }}>
                <span
                  style={{
                    fontSize: 'var(--text-2xl)',
                    fontWeight: 700,
                    color: 'var(--primary)',
                    fontVariantNumeric: 'tabular-nums',
                    lineHeight: 1.1,
                  }}
                >
                  {formatBDT(activeUser.balance)}
                </span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>BDT</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                  }}
                >
                  Current balance
                </span>
              </div>
            </div>

            {/* Direction toggle */}
            <div role='radiogroup' aria-label='Direction'>
              <div
                style={{
                  fontSize: 'var(--text-xs)',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Direction
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-2)',
                }}
              >
                <button
                  type='button'
                  role='radio'
                  aria-checked={direction === 'CREDIT'}
                  onClick={() => setDirection('CREDIT')}
                  style={{
                    cursor: 'pointer',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border:
                      direction === 'CREDIT'
                        ? '2px solid var(--success)'
                        : '1px solid var(--border-color)',
                    background:
                      direction === 'CREDIT' ? 'var(--success-light)' : 'var(--card-bg)',
                    color: direction === 'CREDIT' ? 'var(--success)' : 'var(--text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    textAlign: 'left',
                    transition: 'all var(--duration-fast) var(--ease-standard)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Plus size={14} aria-hidden='true' />
                    Credit
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Add funds to wallet</span>
                </button>
                <button
                  type='button'
                  role='radio'
                  aria-checked={direction === 'DEBIT'}
                  onClick={() => setDirection('DEBIT')}
                  style={{
                    cursor: 'pointer',
                    padding: 'var(--space-3)',
                    borderRadius: 'var(--radius-md)',
                    border:
                      direction === 'DEBIT'
                        ? '2px solid var(--danger)'
                        : '1px solid var(--border-color)',
                    background: direction === 'DEBIT' ? 'var(--danger-light)' : 'var(--card-bg)',
                    color: direction === 'DEBIT' ? 'var(--danger)' : 'var(--text-main)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: 4,
                    textAlign: 'left',
                    transition: 'all var(--duration-fast) var(--ease-standard)',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                    <Minus size={14} aria-hidden='true' />
                    Debit
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Remove funds</span>
                </button>
              </div>
            </div>

            <Input
              label='Amount (BDT)'
              type='number'
              required
              min={1}
              step='0.01'
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError('');
              }}
              hint={
                direction === 'DEBIT' && activeUser
                  ? `Max: ${formatBDT(activeUser.balance)} BDT — cannot go below zero.`
                  : 'Whole or decimal amount, e.g. 500 or 250.50.'
              }
            />

            <Textarea
              label='Reason'
              required
              rows={3}
              placeholder='e.g. Promotional credit, correction for duplicate charge, goodwill refund…'
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              error={reasonTooShort ? `Needs ${REASON_MIN - reason.trim().length} more character${reason.trim().length === REASON_MIN - 1 ? '' : 's'}.` : null}
              hint={`Shown to the user in their notification and transaction history. Minimum ${REASON_MIN} characters · ${reason.trim().length}/${REASON_MIN}`}
            />
          </form>
        )}
      </Sheet>
    </div>
  );
}
