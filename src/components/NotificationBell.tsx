"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  useNotificationStream,
  type NotificationStreamEvent,
} from "@/hooks/useNotificationStream";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  fetchBadgeCount,
  invalidateBadge,
  decrementBadge,
  setBadgeCount,
} from "@/hooks/badgeCache";
import styles from "./NotificationBell.module.css";

type Notification = {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

// Phase 8: the dropdown is now a 5-item preview. The full Notification Center
// lives at /notifications — the bell just hints at what's new and links out.
const PREVIEW_LIMIT = 5;
// Phase 12: badge polling cadence when no realtime transport is active.
// Cheap `/api/notifications/unread-count` round trips — bounded by HTTP
// cache + in-memory dedupe so multiple tabs coalesce.
const BADGE_POLL_MS = 30_000;

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  // Phase 11: aria-busy on the dropdown during fetches so screen readers
  // announce "loading" rather than reading a stale list.
  const [isReloading, setIsReloading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Track the last unread count we observed so we can detect "badge changed"
  // events and refresh the preview only then (Phase 12 optimization).
  const lastObservedCount = useRef<number>(0);
  const { isSupported, subscription, subscribeToPush } = usePushNotifications();

  // ── Phase 12: split fetching ───────────────────────────────────────────
  //
  // `fetchPreview` is the expensive path: it loads the full 5-item preview
  // + the count. Called only on mount, on dropdown open, and when the
  // periodic badge poll detects a delta.
  //
  // `refreshBadge` is the cheap path: just the count from
  // /api/notifications/unread-count. Used for periodic polling so the bell
  // badge stays fresh without re-fetching the list when nothing changed.

  const fetchPreview = useCallback(async () => {
    setIsReloading(true);
    try {
      const res = await fetch(`/api/notifications?limit=${PREVIEW_LIMIT}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications ?? []);
        const count = Number(data.unreadCount ?? 0);
        setUnreadCount(count);
        setBadgeCount(count);
        lastObservedCount.current = count;
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    } finally {
      setIsReloading(false);
    }
  }, []);

  const refreshBadge = useCallback(async () => {
    try {
      const count = await fetchBadgeCount();
      setUnreadCount(count);
      // Phase 12: only re-fetch the preview when the count actually moved.
      // Steady-state polling becomes a single round-trip per cycle instead
      // of a list payload.
      if (count !== lastObservedCount.current) {
        lastObservedCount.current = count;
        // Don't await — preview refresh is best-effort.
        void fetchPreview();
      }
    } catch (error) {
      console.error("Failed to refresh badge", error);
    }
  }, [fetchPreview]);

  // Phase 9: SSE is the preferred realtime transport for in-DOM badge
  // updates. We feed its events into the same state setters as a fetch would.
  const onStreamEvent = useCallback(
    (event: NotificationStreamEvent) => {
      if (event.kind === "ready") {
        setUnreadCount(event.data.unreadCount);
        setBadgeCount(event.data.unreadCount);
        lastObservedCount.current = event.data.unreadCount;
      } else if (event.kind === "unread") {
        setUnreadCount(event.data.unreadCount);
        setBadgeCount(event.data.unreadCount);
        lastObservedCount.current = event.data.unreadCount;
      } else if (event.kind === "notification") {
        // Brand new row from the server. Prepend it to the preview and bump
        // the unread count, mirroring what a fresh GET would return.
        setUnreadCount((c) => {
          const next = c + (event.data.isRead ? 0 : 1);
          setBadgeCount(next);
          lastObservedCount.current = next;
          return next;
        });
        setNotifications((prev) => {
          if (prev.some((n) => n.id === event.data.id)) return prev;
          const next = [
            {
              id: event.data.id,
              title: event.data.title,
              message: event.data.message,
              actionUrl: event.data.actionUrl,
              isRead: event.data.isRead,
              createdAt: event.data.createdAt,
            },
            ...prev,
          ];
          return next.slice(0, PREVIEW_LIMIT);
        });
      }
    },
    [],
  );

  const { connected: streamConnected } = useNotificationStream({
    enabled: true,
    onEvent: onStreamEvent,
  });

  // Initial load: fetch the preview once so the dropdown has content even
  // before the user opens it.
  useEffect(() => {
    void fetchPreview();
  }, [fetchPreview]);

  // Phase 12: polling now hits the cheap badge endpoint. Only the count
  // moves on the wire during steady state; the full preview is re-fetched
  // only when the count changes (handled inside refreshBadge).
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;
    // Only poll when we have no realtime transport. SSE is preferred; push
    // is treated as a sufficient transport because the SW shows the
    // notification and we re-fetch on focus anyway.
    const hasRealtime = streamConnected || Boolean(subscription);
    if (!hasRealtime) {
      intervalId = setInterval(refreshBadge, BADGE_POLL_MS);
    }

    // Re-fetch on window focus so a user returning to the tab sees fresh
    // state immediately, regardless of transport. Always invalidates the
    // badge cache so we don't show a stale number.
    const onFocus = () => {
      if (document.visibilityState === "visible") {
        invalidateBadge();
        void refreshBadge();
      }
    };
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refreshBadge, streamConnected, subscription]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", { method: "PUT" });
      setUnreadCount(0);
      setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
      // Phase 12: optimistic cache update.
      setBadgeCount(0);
      lastObservedCount.current = 0;
    } catch (error) {
      console.error("Failed to mark all as read", error);
    }
  };

  const markAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await fetch(`/api/notifications/${id}/read`, { method: "PUT" });
      setUnreadCount(Math.max(0, unreadCount - 1));
      setNotifications(
        notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
      );
      // Phase 12: optimistic decrement — next badge poll will confirm.
      decrementBadge();
      lastObservedCount.current = Math.max(0, lastObservedCount.current - 1);
    } catch (error) {
      console.error("Failed to mark as read", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && isOpen) {
      setIsOpen(false);
    }
  };

  const handleBellClick = () => {
    const willOpen = !isOpen;
    setIsOpen(willOpen);
    if (willOpen) {
      // Phase 12: refresh the preview whenever the dropdown opens so the
      // user always sees current data, even if SSE has been quiet.
      void fetchPreview();
    }
    if (!subscription && isSupported) {
      // Try to subscribe when they interact with the bell
      subscribeToPush();
    }
  };

  // Trap focus inside the dropdown while it's open; restore to the bell on close.
  useFocusTrap(dropdownRef, isOpen);

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        className={styles.bellButton}
        onClick={handleBellClick}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        aria-haspopup='true'
        aria-expanded={isOpen}
        onKeyDown={handleKeyDown}
      >
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='24'
          height='24'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          aria-hidden='true'
        >
          <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'></path>
          <path d='M13.73 21a2 2 0 0 1-3.46 0'></path>
        </svg>
        {unreadCount > 0 && (
          <span
            className={styles.badge}
            aria-label={`${unreadCount} unread notifications`}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className={styles.dropdown}
          role='dialog'
          aria-modal='true'
          aria-label='Notification panel'
          onKeyDown={handleKeyDown}
        >
          <div className={styles.header}>
            <h3 id='notification-heading'>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={styles.markAllRead}
                aria-label='Mark all notifications as read'
              >
                Mark all as read
              </button>
            )}
          </div>

          <div
            className={styles.list}
            role='log'
            aria-labelledby='notification-heading'
            aria-live='polite'
            aria-atomic='false'
            aria-busy={isReloading}
          >
            {notifications.length === 0 ? (
              <div className={styles.empty} role='status' aria-live='polite'>
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => {
                const NotificationContent = () => (
                  <div
                    className={`${styles.item} ${!notification.isRead ? styles.unread : ""}`}
                    onClick={() =>
                      markAsRead(notification.id, notification.isRead)
                    }
                    role='button'
                    tabIndex={0}
                    aria-label={`${notification.title}: ${notification.message}${!notification.isRead ? ", unread" : ""}`}
                    aria-current={!notification.isRead ? "true" : undefined}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        markAsRead(notification.id, notification.isRead);
                      }
                    }}
                  >
                    <div className={styles.itemContent}>
                      <h4>{notification.title}</h4>
                      <p>{notification.message}</p>
                      <span className={styles.time}>
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {!notification.isRead && (
                      <div className={styles.unreadDot} aria-hidden='true' />
                    )}
                  </div>
                );

                return notification.actionUrl ? (
                  <Link
                    href={notification.actionUrl}
                    key={notification.id}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <NotificationContent />
                  </Link>
                ) : (
                  <div key={notification.id}>
                    <NotificationContent />
                  </div>
                );
              })
            )}
          </div>

          {/* Phase 8: link out to the full Notification Center. Always
              rendered (even when empty) so the user has a path to the page. */}
          <Link
            href='/notifications'
            className={styles.viewAll}
            onClick={() => setIsOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
