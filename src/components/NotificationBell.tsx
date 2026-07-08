'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePushNotifications } from '@/hooks/usePushNotifications';
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
    // Poll every 30 seconds
    const intervalId = setInterval(fetchNotifications, 30000);
    return () => clearInterval(intervalId);
  }, []);

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

  // Format date nicely
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.round((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button 
        className={styles.bellButton}
        onClick={() => {
            setIsOpen(!isOpen);
            if (!subscription && isSupported) {
                // Try to subscribe when they interact with the bell
                subscribeToPush();
            }
        }}
        aria-label="Notifications"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {unreadCount > 0 && (
          <span className={styles.badge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className={styles.markAllRead}>
                Mark all as read
              </button>
            )}
          </div>
          
          <div className={styles.list}>
            {notifications.length === 0 ? (
              <div className={styles.empty}>No notifications yet</div>
            ) : (
              notifications.map((notification) => {
                const NotificationContent = () => (
                    <div 
                        className={`${styles.item} ${!notification.isRead ? styles.unread : ''}`}
                        onClick={() => markAsRead(notification.id, notification.isRead)}
                    >
                        <div className={styles.itemContent}>
                        <h4>{notification.title}</h4>
                        <p>{notification.message}</p>
                        <span className={styles.time}>
                            {new Date(notification.createdAt).toLocaleString()}
                        </span>
                        </div>
                        {!notification.isRead && <div className={styles.unreadDot} />}
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
