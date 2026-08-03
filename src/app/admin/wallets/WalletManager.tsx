'use client';

import { useMemo, useState, useTransition } from 'react';
import { adjustUserBalance } from '@/app/actions/admin';
import { useToast } from '@/components/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import LoadingButton from '@/components/ui/LoadingButton';
import { Modal } from '@/components/ui/Modal';

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

interface Props {
  users: WalletUser[];
  adjustments: Adjustment[];
  focusUserId?: string;
}

export default function WalletManager({ users, adjustments, focusUserId }: Props) {
  const [userList, setUserList] = useState(users);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeUserId, setActiveUserId] = useState<string | null>(focusUserId ?? null);
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 300);

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
    // Highest balance first — admin usually wants to see notable wallets.
    result.sort((a, b) => b.balance - a.balance);
    return result;
  }, [userList, debouncedSearch, roleFilter]);

  const activeUser = userList.find((u) => u.id === activeUserId) ?? null;

  const resetForm = () => {
    setDirection('CREDIT');
    setAmount('');
    setReason('');
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

    const formData = new FormData();
    formData.append('userId', activeUser.id);
    formData.append('direction', direction);
    formData.append('amount', amount);
    formData.append('reason', reason);

    startTransition(async () => {
      const res = await adjustUserBalance(formData);
      if (res?.error) {
        toast.error(res.error);
      } else {
        const signed =
          direction === 'CREDIT' ? `+${amount}` : `-${amount}`;
        toast.success(`Wallet adjusted (${signed} BDT). User notified.`);
        // Optimistically update the row with the server-returned balance.
        setUserList((prev) =>
          prev.map((u) =>
            u.id === activeUser.id
              ? { ...u, balance: res.newBalance ?? u.balance }
              : u,
          ),
        );
        closeModal();
      }
    });
  };

  return (
    <div className='flex flex-col gap-8'>
      {/* Wallets table */}
      <div className='card p-0 overflow-hidden'>
        <div className='flex flex-col sm:flex-row gap-4 p-4 border-b border-color bg-gray-50/50'>
          <div className='flex-1'>
            <Input
              name='search'
              type='text'
              label='Search by name, NSU ID, or email…'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className='w-full sm:w-48'>
            <Select
              label='Filter by role'
              hideLabel
              value={roleFilter}
              onChange={setRoleFilter}
              placeholderOption='All Roles'
              options={[
                { value: 'STUDENT', label: 'Student' },
                { value: 'TUTOR', label: 'Tutor' },
              ]}
            />
          </div>
        </div>

        <div className='data-grid-container'>
          <table className='data-grid hidden md:table'>
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Balance</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div className='font-semibold text-main'>{u.name}</div>
                      <div className='text-xs text-muted mt-1'>{u.nsuId}</div>
                      <div className='text-xs text-muted'>{u.email}</div>
                    </td>
                    <td>
                      <span
                        className={`badge ${u.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td>{u.department?.name || <span className='text-muted italic'>N/A</span>}</td>
                    <td>
                      <span className='font-semibold text-primary text-base'>
                        {u.balance.toLocaleString()} BDT
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => openModal(u.id)}
                        className='btn bg-primary text-white hover:bg-primary-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors'
                      >
                        Adjust Balance
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className='text-center py-8 text-muted'>
                    No users found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile view */}
          <div className='md:hidden flex flex-col gap-4 p-4 bg-gray-50/50'>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => (
                <div key={u.id} className='card p-4 flex flex-col gap-3'>
                  <div className='flex justify-between items-start border-b border-color pb-3'>
                    <div>
                      <div className='font-semibold text-main text-lg'>{u.name}</div>
                      <div className='text-sm text-muted'>{u.nsuId}</div>
                    </div>
                    <span className={`badge ${u.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}>
                      {u.role}
                    </span>
                  </div>
                  <div className='flex items-center justify-between'>
                    <div>
                      <div className='text-muted text-xs uppercase font-bold tracking-wider mb-1'>
                        Balance
                      </div>
                      <div className='font-semibold text-primary text-lg'>
                        {u.balance.toLocaleString()} BDT
                      </div>
                    </div>
                    <button
                      onClick={() => openModal(u.id)}
                      className='btn bg-primary text-white hover:bg-primary-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors'
                    >
                      Adjust
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className='text-center py-8 text-muted'>
                No users found matching your filters.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent adjustments audit feed */}
      <div className='card p-0 overflow-hidden'>
        <div className='p-4 border-b border-color'>
          <h2 className='text-lg font-semibold text-main m-0'>Recent Adjustments</h2>
          <p className='text-sm text-muted mt-1 mb-0'>
            Last 20 admin-initiated wallet changes. Full history lives in each user&rsquo;s transaction log.
          </p>
        </div>
        <div className='data-grid-container'>
          {adjustments.length === 0 ? (
            <div className='p-8 text-center text-muted'>No adjustments yet.</div>
          ) : (
            <table className='data-grid hidden md:table'>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Amount</th>
                  <th>Reason</th>
                  <th>Actioned By</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {adjustments.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <div className='font-semibold text-main'>{a.userName}</div>
                      <div className='text-xs text-muted'>{a.userNsuId}</div>
                    </td>
                    <td>
                      <span
                        className={`font-semibold ${a.amount >= 0 ? 'text-success' : 'text-danger'}`}
                      >
                        {a.amount >= 0 ? '+' : ''}
                        {a.amount.toLocaleString()} BDT
                      </span>
                    </td>
                    <td className='text-sm text-main max-w-xs'>
                      <em>&ldquo;{a.description}&rdquo;</em>
                    </td>
                    <td className='text-sm'>{a.adminName}</td>
                    <td className='text-sm text-muted'>
                      {new Date(a.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Mobile feed */}
          {adjustments.length > 0 && (
            <div className='md:hidden flex flex-col gap-3 p-4 bg-gray-50/50'>
              {adjustments.map((a) => (
                <div key={a.id} className='card p-3 flex flex-col gap-1'>
                  <div className='flex justify-between items-center'>
                    <span className='font-semibold text-main'>{a.userName}</span>
                    <span
                      className={`font-semibold ${a.amount >= 0 ? 'text-success' : 'text-danger'}`}
                    >
                      {a.amount >= 0 ? '+' : ''}
                      {a.amount.toLocaleString()} BDT
                    </span>
                  </div>
                  <div className='text-sm text-main'>
                    <em>&ldquo;{a.description}&rdquo;</em>
                  </div>
                  <div className='text-xs text-muted'>
                    {a.adminName} · {new Date(a.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Adjust balance modal */}
      <Modal
        open={!!activeUser}
        onClose={closeModal}
        title={activeUser ? `Adjust Wallet — ${activeUser.name}` : ''}
        footer={
          <>
            <button
              type='button'
              onClick={closeModal}
              className='btn-secondary px-4 py-2 text-sm'
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
              className='px-4 py-2 text-sm'
            >
              {direction === 'CREDIT' ? 'Credit Wallet' : 'Debit Wallet'}
            </LoadingButton>
          </>
        }
      >
        {activeUser && (
          <form id='adjust-wallet-form' onSubmit={handleSubmit} className='flex flex-col gap-4'>
            <div
              className='bg-gray-50 p-3 rounded-md border border-color text-sm'
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span className='text-muted'>Current balance</span>
              <span className='font-semibold text-primary text-lg'>
                {activeUser.balance.toLocaleString()} BDT
              </span>
            </div>

            <Select
              label='Direction'
              required
              value={direction}
              onChange={(v) => setDirection(v as 'CREDIT' | 'DEBIT')}
              options={[
                { value: 'CREDIT', label: 'Credit (add funds)' },
                { value: 'DEBIT', label: 'Debit (remove funds)' },
              ]}
            />

            <Input
              label='Amount (BDT)'
              type='number'
              required
              min={1}
              step='0.01'
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              hint={
                direction === 'DEBIT' && activeUser
                  ? `Max: ${activeUser.balance.toLocaleString()} BDT — cannot go below zero.`
                  : 'Whole or decimal amount, e.g. 500 or 250.50.'
              }
            />

            <Textarea
              label='Reason'
              required
              rows={3}
              placeholder='e.g. Promotional credit, correction for duplicate charge, goodwill refund…'
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              hint='Shown to the user in their notification and transaction history.'
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
