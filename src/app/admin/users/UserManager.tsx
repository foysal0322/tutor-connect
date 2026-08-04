'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Users,
  GraduationCap,
  Presentation,
  Ban,
  CheckCircle2,
  Search,
  Pencil,
  Wallet,
  ShieldOff,
} from 'lucide-react';
import { toggleBlockUser } from '@/app/actions/admin';
import { useToast } from '@/components/ToastProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { KPI } from '@/components/ui/KPI';
import EmptyState from '@/components/ui/EmptyState';
import DeleteUserButton from './DeleteUserButton';

interface UserRow {
  id: string;
  name: string;
  email: string;
  nsuId: string;
  role: string;
  contact: string | null;
  isBlocked: boolean;
  createdAt: string;
  department: { name: string } | null;
}

interface Props {
  users: UserRow[];
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

function avatarBg(role: string, isBlocked: boolean): { bg: string; fg: string } {
  if (isBlocked) return { bg: 'var(--danger-light)', fg: 'var(--danger)' };
  if (role === 'TUTOR') return { bg: 'var(--primary-light)', fg: 'var(--primary)' };
  return { bg: 'var(--accent-light)', fg: 'var(--accent)' };
}

export default function UserManager({ users }: Props) {
  const [userList, setUserList] = useState(users);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'BLOCKED'>('ALL');
  const [pendingBlockId, setPendingBlockId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredUsers = useMemo(() => {
    let result = [...userList];
    if (roleFilter) result = result.filter((u) => u.role === roleFilter);
    if (statusFilter === 'ACTIVE') result = result.filter((u) => !u.isBlocked);
    if (statusFilter === 'BLOCKED') result = result.filter((u) => u.isBlocked);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.nsuId.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    return result;
  }, [userList, debouncedSearch, roleFilter, statusFilter]);

  // KPI derivations (cheap, client-side).
  const total = userList.length;
  const studentCount = userList.filter((u) => u.role === 'STUDENT').length;
  const tutorCount = userList.filter((u) => u.role === 'TUTOR').length;
  const blockedCount = userList.filter((u) => u.isBlocked).length;

  function handleToggleBlock(user: UserRow) {
    startTransition(async () => {
      setPendingBlockId(user.id);
      const res = await toggleBlockUser(user.id, !user.isBlocked);
      setPendingBlockId(null);
      if (res?.error) {
        toast.error(res.error);
      } else {
        setUserList((prev) =>
          prev.map((u) =>
            u.id === user.id ? { ...u, isBlocked: !user.isBlocked } : u,
          ),
        );
        toast.success(user.isBlocked ? 'User unblocked.' : 'User blocked.');
      }
    });
  }

  function handleDelete(userId: string) {
    setUserList((prev) => prev.filter((u) => u.id !== userId));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      <PageHeader
        icon={<Users size={18} aria-hidden='true' />}
        title='User Management'
        subtitle='View, edit, block, or delete student and tutor accounts. Wallet adjustments open the wallet tool pre-filled with the member.'
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
          label='Total Members'
          value={total.toLocaleString()}
          icon={<Users size={16} aria-hidden='true' />}
          tone='info'
          variant='accent'
          hint='Students + tutors'
        />
        <KPI
          label='Students'
          value={studentCount.toLocaleString()}
          icon={<GraduationCap size={16} aria-hidden='true' />}
          tone='accent'
          variant='accent'
        />
        <KPI
          label='Tutors'
          value={tutorCount.toLocaleString()}
          icon={<Presentation size={16} aria-hidden='true' />}
          tone='primary'
          variant='accent'
        />
        <KPI
          label='Blocked'
          value={blockedCount.toLocaleString()}
          icon={<Ban size={16} aria-hidden='true' />}
          tone={blockedCount > 0 ? 'danger' : 'neutral'}
          variant='accent'
        />
      </div>

      {/* Users table */}
      <section
        className='card'
        style={{ padding: 0, overflow: 'hidden' }}
        aria-label='Member accounts'
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
            <>
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
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <div
                role='radiogroup'
                aria-label='Filter by status'
                style={{
                  display: 'inline-flex',
                  gap: 2,
                  background: 'var(--surface-2)',
                  padding: 2,
                  borderRadius: 'var(--radius-md)',
                }}
              >
                {([
                  { value: 'ALL', label: 'All' },
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'BLOCKED', label: 'Blocked' },
                ] as const).map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type='button'
                      role='radio'
                      aria-checked={active}
                      onClick={() => setStatusFilter(opt.value)}
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
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </>
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

        <div className='data-grid-container'>
          {filteredUsers.length === 0 ? (
            <EmptyState
              icon={<Users size={32} aria-hidden='true' />}
              title='No members match your filters'
              description='Try a different name, NSU ID, or email, or clear the role/status filters.'
            />
          ) : (
            <>
              {/* Desktop / tablet table */}
              <table className='data-grid' style={{ display: 'table' }}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Member</th>
                    <th style={{ width: '10%' }}>Role</th>
                    <th style={{ width: '15%' }}>Department</th>
                    <th style={{ width: '15%' }}>Contact</th>
                    <th style={{ width: '10%' }}>Joined</th>
                    <th style={{ width: '20%', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const colors = avatarBg(user.role, user.isBlocked);
                    return (
                      <tr
                        key={user.id}
                        style={{
                          opacity: user.isBlocked ? 0.65 : 1,
                          background: user.isBlocked ? 'var(--surface-1)' : undefined,
                        }}
                      >
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <span
                              aria-hidden='true'
                              style={{
                                flexShrink: 0,
                                width: 32,
                                height: 32,
                                borderRadius: 'var(--radius-full)',
                                background: colors.bg,
                                color: colors.fg,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {initials(user.name)}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 600,
                                  color: 'var(--text-main)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 'var(--space-1)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {user.name}
                                {user.isBlocked && (
                                  <span
                                    title='Blocked'
                                    style={{
                                      display: 'inline-flex',
                                      color: 'var(--danger)',
                                    }}
                                  >
                                    <Ban size={12} aria-hidden='true' />
                                  </span>
                                )}
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
                                {user.nsuId} · {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`badge ${user.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}
                          >
                            {user.role === 'TUTOR' ? 'Tutor' : 'Student'}
                          </span>
                        </td>
                        <td
                          style={{
                            fontSize: 'var(--text-sm)',
                            color: user.department?.name ? 'var(--text-main)' : 'var(--text-muted)',
                            fontStyle: user.department?.name ? 'normal' : 'italic',
                          }}
                        >
                          {user.department?.name || 'N/A'}
                        </td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {user.contact || '—'}
                        </td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(user.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td>
                          <div
                            style={{
                              display: 'flex',
                              gap: 'var(--space-1)',
                              justifyContent: 'flex-end',
                              flexWrap: 'wrap',
                            }}
                          >
                            <Link
                              href={`/admin/users/${user.id}`}
                              aria-label={`Edit ${user.name}`}
                              title='Edit'
                              className='btn btn-secondary btn-sm'
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Pencil size={12} aria-hidden='true' />
                              Edit
                            </Link>
                            <Link
                              href={`/admin/wallets?userId=${user.id}`}
                              aria-label={`Adjust ${user.name}'s wallet`}
                              title='Adjust wallet'
                              className='btn btn-secondary btn-sm'
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                            >
                              <Wallet size={12} aria-hidden='true' />
                              Wallet
                            </Link>
                            <button
                              type='button'
                              onClick={() => handleToggleBlock(user)}
                              disabled={isPending && pendingBlockId === user.id}
                              aria-label={user.isBlocked ? `Unblock ${user.name}` : `Block ${user.name}`}
                              title={user.isBlocked ? 'Unblock' : 'Block'}
                              className={`btn btn-sm ${user.isBlocked ? 'btn-primary' : ''}`}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                ...(user.isBlocked
                                  ? {}
                                  : {
                                      background: 'var(--accent-light)',
                                      color: 'var(--accent-hover)',
                                      border: '1px solid transparent',
                                    }),
                              }}
                            >
                              {user.isBlocked ? (
                                <CheckCircle2 size={12} aria-hidden='true' />
                              ) : (
                                <ShieldOff size={12} aria-hidden='true' />
                              )}
                              {user.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                            <DeleteUserButton userId={user.id} onDelete={handleDelete} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div
                className='md:hidden'
                style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-color)' }}
              >
                {filteredUsers.map((user) => {
                  const colors = avatarBg(user.role, user.isBlocked);
                  return (
                    <div
                      key={user.id}
                      style={{
                        background: 'var(--card-bg)',
                        padding: 'var(--space-3)',
                        opacity: user.isBlocked ? 0.7 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                        <span
                          aria-hidden='true'
                          style={{
                            flexShrink: 0,
                            width: 36,
                            height: 36,
                            borderRadius: 'var(--radius-full)',
                            background: colors.bg,
                            color: colors.fg,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {initials(user.name)}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: 'var(--text-main)',
                                fontSize: 'var(--text-sm)',
                              }}
                            >
                              {user.name}
                            </span>
                            <span
                              className={`badge ${user.role === 'TUTOR' ? 'badge-primary' : 'badge-secondary'}`}
                              style={{ fontSize: 10, padding: '1px 6px' }}
                            >
                              {user.role === 'TUTOR' ? 'Tutor' : 'Student'}
                            </span>
                            {user.isBlocked && (
                              <span
                                className='badge badge-warning'
                                style={{ fontSize: 10, padding: '1px 6px' }}
                              >
                                Blocked
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                            {user.nsuId} · {user.email}
                          </div>
                          <div
                            style={{
                              marginTop: 'var(--space-2)',
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: 'var(--space-2)',
                              fontSize: 11,
                              color: 'var(--text-muted)',
                            }}
                          >
                            <div>
                              <div style={{ fontWeight: 600 }}>Dept</div>
                              <div style={{ color: 'var(--text-main)' }}>
                                {user.department?.name || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>Contact</div>
                              <div style={{ color: 'var(--text-main)' }}>
                                {user.contact || '—'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          marginTop: 'var(--space-3)',
                          paddingTop: 'var(--space-3)',
                          borderTop: '1px solid var(--border-color)',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <Link
                          href={`/admin/users/${user.id}`}
                          className='btn btn-secondary btn-sm'
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <Pencil size={12} aria-hidden='true' />
                          Edit
                        </Link>
                        <Link
                          href={`/admin/wallets?userId=${user.id}`}
                          className='btn btn-secondary btn-sm'
                          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        >
                          <Wallet size={12} aria-hidden='true' />
                          Wallet
                        </Link>
                        <button
                          type='button'
                          onClick={() => handleToggleBlock(user)}
                          disabled={isPending && pendingBlockId === user.id}
                          className={`btn btn-sm ${user.isBlocked ? 'btn-primary' : ''}`}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 4,
                            ...(user.isBlocked
                              ? {}
                              : {
                                  background: 'var(--accent-light)',
                                  color: 'var(--accent-hover)',
                                }),
                          }}
                        >
                          {user.isBlocked ? (
                            <CheckCircle2 size={12} aria-hidden='true' />
                          ) : (
                            <ShieldOff size={12} aria-hidden='true' />
                          )}
                          {user.isBlocked ? 'Unblock' : 'Block'}
                        </button>
                        <DeleteUserButton userId={user.id} onDelete={handleDelete} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
