'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import styles from './NotificationBell.module.css';

type Notification = {
  id: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { isSupported, subscription, subscribeToPush } = usePushNotifications();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?limit=20');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error('Failed to fetch notifications', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Polling fallback: only run when web push is NOT active.
    // Once a push subscription is in place, the service worker receives
    // notifications in real time and polling becomes redundant battery drain.
    // See FRONTEND_AUDIT.md F3.
    let intervalId: ReturnType<typeof setInterval> | null = null;
    if (!subscription) {
      intervalId = setInterval(fetchNotifications, 30000);
    }

    // Re-fetch on window focus so a user returning to the tab sees fresh
    // state immediately, regardless of transport.
    const onFocus = () => {
      if (document.visibilityState === 'visible') fetchNotifications();
    };
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      if (intervalId) clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [subscription]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'PUT' });
      setUnreadCount(0);
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  const markAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'PUT' });
      setUnreadCount(Math.max(0, unreadCount - 1));
      setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      setIsOpen(false);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
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
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        onKeyDown={handleKeyDown}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge} aria-label={`${unreadCount} unread notifications`}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div
          className={styles.dropdown}
          role="dialog"
          aria-modal="true"
          aria-label="Notification panel"
          onKeyDown={handleKeyDown}
        >
          <div className={styles.header}>
            <h3 id="notification-heading">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className={styles.markAllRead}
                aria-label="Mark all notifications as read"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className={styles.list} role="region" aria-labelledby="notification-heading" aria-live="polite" aria-atomic="true">
            {notifications.length === 0 ? (
              <div className={styles.empty} role="status" aria-live="polite">No notifications yet</div>
            ) : (
              notifications.map((notification) => {
                const NotificationContent = () => (
                    <div
                        className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                        onClick={() => markAsRead(notification.id, notification.isRead)}
                        role="button"
                        tabIndex={0}
                        aria-label={`${notification.title}: ${notification.message}${!notification.isRead ? ', unread' : ''}`}
                        aria-current={!notification.isRead ? 'true' : undefined}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
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
                        {!notification.isRead && <div className={styles.unreadDot} aria-hidden="true" />}
                    </div>
                );

                return notification.actionUrl ? (
                    <Link href={notification.actionUrl} key={notification.id} style={{textDecoration: 'none', color: 'inherit'}}>
                        <NotificationContent />
                    </Link>
                ) : (
                    <div key={notification.id}>
                        <NotificationContent />
                    </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
