'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './layout.module.css';

const COLLAPSE_KEY = 'nsuone.sidebar.collapsed';

export default function DashboardLayout({
  children,
  role,
  userName,
  userEmail,
  currentCounts,
}: {
  children: React.ReactNode;
  role: 'ADMIN' | 'STUDENT' | 'TUTOR';
  userName?: string | null;
  userEmail?: string | null;
  currentCounts?: any;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  // Desktop icon-rail collapse (Phase 4). Read persisted state on mount so
  // reloads + cross-tab navigation honor the user's preference. SSR renders
  // expanded to match the server HTML; the effect syncs after hydration.
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(COLLAPSE_KEY) === '1';
      setIsCollapsed(stored);
    } catch {
      /* localStorage unavailable — default expanded */
    }
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const shell: 'ADMIN' | 'MEMBER' = role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  const user =
    userName || userEmail
      ? { name: userName ?? null, email: userEmail ?? null, role }
      : undefined;

  return (
    <div className={styles.layout}>
      {/* Mobile Overlay */}
      <div
        className={`${styles.overlay} ${isSidebarOpen ? styles.open : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      <Sidebar
        role={role}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentCounts={currentCounts}
        collapsed={isCollapsed}
      />

      <div className={styles.mainWrapper}>
        <Topbar
          shell={shell}
          user={user}
          isSidebarOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen(true)}
          isCollapsed={isCollapsed}
          onToggleCollapse={toggleCollapse}
        />
        <main className={styles.content}>
          <div className="container container-wide animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
