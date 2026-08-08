'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Pencil, Pause, Play, Trash2 } from 'lucide-react';
import { updateListingStatus } from '@/app/(member)/shop/selling/actions';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { formatBDT } from '@/lib/shop/service';
import styles from './SellerListingsTable.module.css';

export interface SellerListingRow {
  id: string;
  title: string;
  priceBdt: number;
  quantity: number;
  condition: string;
  status:
    | 'DRAFT'
    | 'PENDING_REVIEW'
    | 'ACTIVE'
    | 'PAUSED'
    | 'SOLD'
    | 'EXPIRED'
    | 'REJECTED'
    | 'REMOVED';
  viewCount: number;
  savedCount: number;
  createdAt: string;
  category: string;
}

const STATUS_TONE: Record<SellerListingRow['status'], BadgeTone> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'info',
  ACTIVE: 'success',
  PAUSED: 'warning',
  SOLD: 'neutral',
  EXPIRED: 'neutral',
  REJECTED: 'danger',
  REMOVED: 'danger',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function SellerListingsTable({ rows }: { rows: SellerListingRow[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  async function handleAction(listingId: string, action: 'pause' | 'resume' | 'delete') {
    setPendingId(listingId);
    setError('');
    startTransition(async () => {
      const fd = new FormData();
      fd.set('listingId', listingId);
      fd.set('action', action);
      const res = await updateListingStatus(fd);
      if (!res.ok) setError(res.error);
      setPendingId(null);
    });
  }

  return (
    <div className={styles.wrap}>
      {error && (
        <div role='alert' className={styles.error}>
          {error}
        </div>
      )}
      <div className={styles.tableWrap} role='region' aria-label='Your listings'>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Listing</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Views</th>
              <th>Created</th>
              <th aria-label='Actions'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isPending = pendingId === row.id;
              const canPause = row.status === 'ACTIVE';
              const canResume = row.status === 'PAUSED';
              const canEdit =
                row.status === 'DRAFT' ||
                row.status === 'ACTIVE' ||
                row.status === 'PAUSED' ||
                row.status === 'PENDING_REVIEW';
              const canDelete = canEdit;
              return (
                <tr key={row.id}>
                  <td>
                    <Link
                      href={`/shop/listing/${row.id}`}
                      className={styles.titleLink}
                    >
                      {row.title}
                    </Link>
                    <div className={styles.meta}>
                      {row.condition} · qty {row.quantity}
                    </div>
                  </td>
                  <td>{row.category}</td>
                  <td className={styles.price}>{formatBDT(row.priceBdt)}</td>
                  <td>
                    <Badge tone={STATUS_TONE[row.status]}>
                      {row.status.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </td>
                  <td className={styles.num}>{row.viewCount}</td>
                  <td>{formatDate(row.createdAt)}</td>
                  <td className={styles.actions}>
                    {canEdit && (
                      <Link
                        href={`/shop/selling/listing/${row.id}`}
                        className={styles.iconBtn}
                        title='Edit'
                        aria-label={`Edit ${row.title}`}
                      >
                        <Pencil size={14} aria-hidden='true' />
                      </Link>
                    )}
                    {canPause && (
                      <button
                        type='button'
                        className={styles.iconBtn}
                        title='Pause'
                        aria-label={`Pause ${row.title}`}
                        disabled={isPending}
                        onClick={() => handleAction(row.id, 'pause')}
                      >
                        <Pause size={14} aria-hidden='true' />
                      </button>
                    )}
                    {canResume && (
                      <button
                        type='button'
                        className={styles.iconBtn}
                        title='Resume'
                        aria-label={`Resume ${row.title}`}
                        disabled={isPending}
                        onClick={() => handleAction(row.id, 'resume')}
                      >
                        <Play size={14} aria-hidden='true' />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        type='button'
                        className={`${styles.iconBtn} ${styles.danger}`}
                        title='Delete'
                        aria-label={`Delete ${row.title}`}
                        disabled={isPending}
                        onClick={() => {
                          if (confirm(`Delete "${row.title}"? This cannot be undone.`)) {
                            handleAction(row.id, 'delete');
                          }
                        }}
                      >
                        <Trash2 size={14} aria-hidden='true' />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
