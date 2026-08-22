'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './NotificationCenterClient.module.css';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import EmptyState from '@/components/ui/EmptyState';
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react';

export type NotificationListItem = {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  type: string;
  category: string;
  priority: string;
  createdAt: string;
};

// The category chips shown in the filter toolbar. Pulled from §VII.1 of the
// blueprint — high-signal groupings rather than the full enum. "All" is the
// default and shows everything.
const CATEGORIES: Array<{ key: string; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'PAYMENT', label: 'Payments' },
  { key: 'BOOKING', label: 'Bookings' },
  { key: 'WALLET', label: 'Wallet' },
  { key: 'WITHDRAWAL', label: 'Withdrawals' },
  { key: 'REFUND', label: 'Refunds' },
  { key: 'CONSULTANCY', label: 'Consultancy' },
  { key: 'SUPPORT', label: 'Support' },
  { key: 'AUTH', label: 'Account' },
  { key: 'SECURITY', label: 'Security' },
  { key: 'SYSTEM', label: 'System' },
];

// Priority → ARIA-friendly accent class. Drives the left border + icon tint
// so critical items visually leap out without breaking contrast rules.
function priorityClass(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return styles.priorityCritical;
    case 'HIGH':
      return styles.priorityHigh;
    case 'LOW':
      return styles.priorityLow;
    default:
      return styles.priorityMedium;
  }
}

// Bucket a Date into one of the four section labels. Order of checks matters
// — Today must be exactly today, Yesterday exactly one calendar day back.
function bucketFor(iso: string): 'Today' | 'Yesterday' | 'This Week' | 'Older' {
  const then = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = startOfToday.getTime() - then.getTime();
  const dayMs = 24 * 60 * 60 * 1000;
  if (ms < dayMs) return 'Today';
  if (ms < 2 * dayMs) return 'Yesterday';
  if (ms < 7 * dayMs) return 'This Week';
  return 'Older';
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

interface Props {
  initialItems: NotificationListItem[];
  initialUnreadCount: number;
  initialCursor: string | null;
}

export default function NotificationCenterClient({
  initialItems,
  initialUnreadCount,
  initialCursor,
}: Props) {
  const [items, setItems] = useState<NotificationListItem[]>(initialItems);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // When filters change we drop the existing list and re-fetch from page 1.
  // The server is the source of truth; client state is rebuilt from each
  // response. We track the active filter signature in a ref to ignore stale
  // fetches that complete after the user has moved on.
  const activeFilterRef = useRef<string>('');
  const reload = useCallback(
    async (nextCategory: string, nextUnread: boolean) => {
      const filterSig = `${nextCategory}|${nextUnread}`;
      activeFilterRef.current = filterSig;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ limit: '30' });
        if (nextCategory !== 'all') params.set('category', nextCategory);
        if (nextUnread) params.set('archived', 'false');
        // When "unread only" is selected we additionally need the server to
        // honor isRead filtering. The GET endpoint doesn't currently expose
        // isRead as a query param, so we filter client-side after fetch —
        // acceptable since the page size is bounded at 30.
        const res = await fetch(`/api/notifications?${params.toString()}`);
        if (!res.ok) throw new Error('Request failed');
        const data = await res.json();
        // Ignore stale responses.
        if (activeFilterRef.current !== filterSig) return;
        const filtered = nextUnread
          ? (data.notifications as NotificationListItem[]).filter((n) => !n.isRead)
          : (data.notifications as NotificationListItem[]);
        setItems(filtered);
        setCursor(data.nextCursor ?? null);
        setSelected(new Set());
      } catch (e) {
        console.error('Failed to reload notifications', e);
        setError('Could not load notifications. Try again.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const onCategoryChange = (next: string) => {
    setCategory(next);
    void reload(next, unreadOnly);
  };
  const onUnreadOnlyToggle = () => {
    const next = !unreadOnly;
    setUnreadOnly(next);
    void reload(category, next);
  };

  // Load more using the cursor. Appends to the existing list; preserves
  // selection state.
  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '30', cursor });
      if (category !== 'all') params.set('category', category);
      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error('Request failed');
      const data = await res.json();
      const appended = unreadOnly
        ? (data.notifications as NotificationListItem[]).filter((n) => !n.isRead)
        : (data.notifications as NotificationListItem[]);
      setItems((prev) => {
        // De-dup by id in case the server overlaps the boundary.
        const seen = new Set(prev.map((n) => n.id));
        return [...prev, ...appended.filter((n) => !seen.has(n.id))];
      });
      setCursor(data.nextCursor ?? null);
    } catch (e) {
      console.error('Failed to load more', e);
      setError('Could not load more. Try again.');
    } finally {
      setLoading(false);
    }
  }, [cursor, loading, category, unreadOnly]);

  // ── Mutations ──────────────────────────────────────────────────────────
  // All mutations are optimistic on the client. The server is the source of
  // truth on the next reload. Failures roll back the optimistic state and
  // surface an inline error.

  const markRead = async (id: string) => {
    const prev = items;
    setItems((cur) =>
      cur.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      ),
    );
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch (e) {
      console.error('markRead failed', e);
      setItems(prev);
    }
  };

  const markAllRead = async () => {
    const prev = items;
    setItems((cur) =>
      cur.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() })),
    );
    try {
      const res = await fetch('/api/notifications/read-all', { method: 'PUT' });
      // fetch resolves even on 401/500 — throw so the optimistic update
      // rolls back instead of silently reverting on the next reload.
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch (e) {
      console.error('markAllRead failed', e);
      setItems(prev);
    }
  };

  const archive = async (id: string) => {
    const prev = items;
    setItems((cur) => cur.filter((n) => n.id !== id));
    setSelected((cur) => {
      const next = new Set(cur);
      next.delete(id);
      return next;
    });
    try {
      const res = await fetch(`/api/notifications/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch (e) {
      console.error('archive failed', e);
      setItems(prev);
    }
  };

  const bulkMarkRead = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const prev = items;
    setItems((cur) =>
      cur.map((n) =>
        ids.includes(n.id)
          ? { ...n, isRead: true, readAt: new Date().toISOString() }
          : n,
      ),
    );
    try {
      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'mark_read' }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch (e) {
      console.error('bulkMarkRead failed', e);
      setItems(prev);
    }
  };

  const bulkArchive = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const prev = items;
    setItems((cur) => cur.filter((n) => !ids.includes(n.id)));
    setSelected(new Set());
    try {
      const res = await fetch('/api/notifications/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action: 'archive' }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    } catch (e) {
      console.error('bulkArchive failed', e);
      setItems(prev);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  // ── Infinite scroll ─────────────────────────────────────────────────────
  // Sentinel element at the bottom of the list. When it intersects the
  // viewport we load the next page (if one exists).
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!cursor) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          void loadMore();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  // Group items into date buckets for display. Order is fixed; empty buckets
  // are skipped.
  const grouped = useMemo(() => {
    const buckets: Record<string, NotificationListItem[]> = {
      Today: [],
      Yesterday: [],
      'This Week': [],
      Older: [],
    };
    for (const n of items) buckets[bucketFor(n.createdAt)].push(n);
    return buckets;
  }, [items]);

  const bucketOrder = ['Today', 'Yesterday', 'This Week', 'Older'] as const;
  const unread = items.filter((n) => !n.isRead).length;

  // Phase 11: "select all visible" affordance so keyboard-only users can
  // grab every item without tabbing through every checkbox.
  const allVisibleSelected = items.length > 0 && items.every((n) => selected.has(n.id));
  const someVisibleSelected = items.some((n) => selected.has(n.id));
  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      // Deselect only the visible ones (leave any hypothetical out-of-view
      // selections alone — though with our reload-on-filter, that's moot).
      setSelected((cur) => {
        const next = new Set(cur);
        for (const n of items) next.delete(n.id);
        return next;
      });
    } else {
      setSelected((cur) => {
        const next = new Set(cur);
        for (const n of items) next.add(n.id);
        return next;
      });
    }
  };

  return (
    <div className={styles.container} aria-busy={loading && items.length === 0}>
      {/* Filter toolbar */}
      <div className={styles.toolbar} role='toolbar' aria-label='Notification filters'>
        <div className={styles.categories} role='group' aria-label='Filter by category'>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              className={`${styles.chip} ${category === c.key ? styles.chipActive : ''}`}
              onClick={() => onCategoryChange(c.key)}
              aria-pressed={category === c.key}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className={styles.toolbarActions}>
          {/* Phase 11: select-all checkbox surfaces in the toolbar so
              keyboard-only users can grab the visible set in one tab stop
              instead of arrowing through every row. */}
          {items.length > 0 && (
            <label className={styles.selectAllLabel}>
              <input
                type='checkbox'
                className={styles.checkbox}
                checked={allVisibleSelected}
                ref={(el) => {
                  if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                }}
                onChange={toggleSelectAll}
                aria-label='Select all visible notifications'
              />
              Select all
            </label>
          )}
          <button
            className={`${styles.toggle} ${unreadOnly ? styles.toggleActive : ''}`}
            onClick={onUnreadOnlyToggle}
            aria-pressed={unreadOnly}
          >
            Unread only
          </button>
          <button
            className={styles.textButton}
            onClick={markAllRead}
            disabled={unread === 0}
            title='Mark all visible as read'
          >
            <CheckCheck size={16} aria-hidden='true' /> Mark all read
          </button>
        </div>
      </div>

      {/* Phase 11: polite live region for status updates (filter changes,
          pagination). Visually hidden; announces to assistive tech only. */}
      <div className={styles.srOnly} role='status' aria-live='polite'>
        {loading && items.length === 0
          ? 'Loading notifications'
          : error
            ? `Error: ${error}`
            : `${items.length} notification${items.length === 1 ? '' : 's'} shown${
                unread > 0 ? `, ${unread} unread` : ''
              }`}
      </div>

      {/* Bulk action bar — appears when items are selected */}
      {selected.size > 0 && (
        <div className={styles.bulkBar} role='region' aria-label='Bulk actions'>
          <span className={styles.bulkCount} aria-live='polite'>
            {selected.size} selected
          </span>
          <div className={styles.bulkActions}>
            <button
              className={styles.bulkButton}
              onClick={bulkMarkRead}
              aria-label='Mark selected notifications as read'
            >
              <Check size={16} aria-hidden='true' /> Mark read
            </button>
            <button
              className={styles.bulkButton}
              onClick={bulkArchive}
              aria-label='Archive selected notifications'
            >
              <Trash2 size={16} aria-hidden='true' /> Archive
            </button>
            <button
              className={styles.bulkButtonGhost}
              onClick={clearSelection}
              aria-label='Clear selection'
            >
              <X size={16} aria-hidden='true' />
            </button>
          </div>
        </div>
      )}

      {/* List body */}
      {error && (
        <div className={styles.error} role='alert'>
          {error}
        </div>
      )}

      {items.length === 0 && !loading ? (
        <EmptyState
          icon={<Bell size={36} />}
          title={unreadOnly ? 'No unread notifications' : 'No notifications'}
          description={
            unreadOnly
              ? 'You are all caught up. New activity will appear here.'
              : 'When something happens on your account — payments, bookings, withdrawals — it shows up here.'
          }
        />
      ) : (
        <div className={styles.list}>
          {bucketOrder.map((bucket) => {
            const bucketItems = grouped[bucket];
            if (bucketItems.length === 0) return null;
            return (
              <section key={bucket} className={styles.section}>
                <h2 className={styles.sectionHeading}>{bucket}</h2>
                <ul className={styles.itemList}>
                  {bucketItems.map((n) => {
                    const isSelected = selected.has(n.id);
                    return (
                      <li
                        key={n.id}
                        className={`${styles.row} ${priorityClass(n.priority)} ${
                          !n.isRead ? styles.rowUnread : ''
                        } ${isSelected ? styles.rowSelected : ''}`}
                      >
                        <label className={styles.checkboxLabel}>
                          <input
                            type='checkbox'
                            className={styles.checkbox}
                            checked={isSelected}
                            onChange={() => toggleSelect(n.id)}
                            aria-label={`Select notification: ${n.title}`}
                          />
                          <span className={styles.rowContent}>
                            <span className={styles.rowHeader}>
                              <span className={styles.rowTitle}>{n.title}</span>
                              {!n.isRead && (
                                <span className={styles.unreadDot} aria-label='Unread' />
                              )}
                            </span>
                            <span className={styles.rowMessage}>{n.message}</span>
                            <span className={styles.rowMeta}>
                              <span className={styles.categoryPill}>{n.category}</span>
                              <span className={styles.dot}>·</span>
                              <span className={styles.time}>
                                {relativeTime(n.createdAt)}
                              </span>
                            </span>
                          </span>
                        </label>

                        <div className={styles.rowActions}>
                          {!n.isRead && (
                            <button
                              className={styles.iconButton}
                              onClick={() => markRead(n.id)}
                              aria-label={`Mark "${n.title}" as read`}
                              title='Mark as read'
                            >
                              <Check size={16} aria-hidden='true' />
                            </button>
                          )}
                          <button
                            className={styles.iconButton}
                            onClick={() => archive(n.id)}
                            aria-label={`Archive "${n.title}"`}
                            title='Archive'
                          >
                            <Trash2 size={16} aria-hidden='true' />
                          </button>
                          {n.actionUrl && (
                            <Link
                              href={n.actionUrl}
                              className={styles.openLink}
                              aria-label={`Open "${n.title}"`}
                              onClick={() => !n.isRead && markRead(n.id)}
                            >
                              Open
                            </Link>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}

          {/* Infinite scroll sentinel. Always rendered when there's a cursor
              so the IntersectionObserver has something to bind to. */}
          {cursor && (
            <div ref={sentinelRef} className={styles.sentinel}>
              {loading && (
                <div className={styles.loadMoreLoading}>
                  <LoadingSpinner size='sm' /> Loading more…
                </div>
              )}
            </div>
          )}
          {!cursor && items.length > 0 && (
            <div className={styles.endMark}>You&apos;re all caught up.</div>
          )}
        </div>
      )}
    </div>
  );
}
