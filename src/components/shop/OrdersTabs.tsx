'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { formatBDT, orderStatusLabel } from '@/lib/shop/service';
import styles from './OrdersTabs.module.css';

export interface OrderRow {
  id: string;
  status: string;
  quantity: number;
  subtotalBdt: number;
  payoutBdt: number;
  createdAt: string;
  updatedAt: string;
  listing: { id: string; title: string } | null;
  listingSnapshot: { title?: string };
  counterparty: { id: string; name: string };
  role: 'buying' | 'selling';
}

const STATUS_TONE: Record<string, BadgeTone> = {
  AWAITING_CONFIRMATION: 'neutral',
  ESCROWED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  DISPUTED: 'warning',
  REFUNDED: 'neutral',
  CANCELLED: 'neutral',
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'ESCROWED', label: 'In escrow' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

interface Props {
  activeTab: 'buying' | 'selling';
  counts: { buying: number; selling: number };
  currentStatus: string;
  orders: OrderRow[];
  emptyState?: React.ReactNode;
}

export default function OrdersTabs({
  activeTab,
  counts,
  currentStatus,
  orders,
  emptyState,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();

  function pushParams(opts: { tab?: 'buying' | 'selling'; status?: string }) {
    const sp = new URLSearchParams();
    const tab = opts.tab ?? activeTab;
    const status = opts.status ?? currentStatus;
    sp.set('tab', tab);
    if (status && status !== 'all') sp.set('status', status);
    router.push(`${pathname}?${sp.toString()}`);
  }

  return (
    <div>
      <div className={styles.tabBar} role='tablist'>
        <button
          role='tab'
          aria-selected={activeTab === 'buying'}
          className={`${styles.tab} ${activeTab === 'buying' ? styles.tabActive : ''}`}
          onClick={() => pushParams({ tab: 'buying', status: 'all' })}
        >
          Buying <span className={styles.tabCount}>{counts.buying}</span>
        </button>
        <button
          role='tab'
          aria-selected={activeTab === 'selling'}
          className={`${styles.tab} ${activeTab === 'selling' ? styles.tabActive : ''}`}
          onClick={() => pushParams({ tab: 'selling', status: 'all' })}
        >
          Selling <span className={styles.tabCount}>{counts.selling}</span>
        </button>
      </div>

      <div className={styles.filterRow} role='toolbar' aria-label='Status filter'>
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type='button'
            className={`${styles.filterChip} ${
              currentStatus === f.value ? styles.filterChipActive : ''
            }`}
            onClick={() => pushParams({ status: f.value })}
            aria-pressed={currentStatus === f.value}
          >
            {f.label}
          </button>
        ))}
      </div>

      {orders.length === 0 && emptyState ? (
        emptyState
      ) : (
        <div className={styles.list}>
          {orders.map((o) => {
            const title = o.listing?.title ?? o.listingSnapshot.title ?? 'Item';
            return (
              <Link
                key={o.id}
                href={`/shop/orders/${o.id}`}
                className={styles.row}
              >
                <div className={styles.rowMain}>
                  <div className={styles.rowTitle}>{title}</div>
                  <div className={styles.rowMeta}>
                    {activeTab === 'buying' ? 'From' : 'To'}:{' '}
                    <strong>{o.counterparty.name}</strong>
                    <span aria-hidden='true'> · </span>
                    {new Date(o.createdAt).toLocaleDateString()}
                    <span aria-hidden='true'> · </span>×{o.quantity}
                  </div>
                </div>
                <div className={styles.rowSide}>
                  <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>
                    {orderStatusLabel(o.status)}
                  </Badge>
                  <div className={styles.rowAmount}>
                    {activeTab === 'buying'
                      ? formatBDT(o.subtotalBdt)
                      : `${formatBDT(o.payoutBdt)} (payout)`}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
