'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import styles from './layout.module.css';

export default function DashboardLayout({
  children,
  role,
  userName,
  userEmail,
  currentCounts
}: {
  children: React.ReactNode;
  role: 'ADMIN' | 'STUDENT' | 'TUTOR';
  userName?: string | null;
  userEmail?: string | null;
  currentCounts?: any;
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Derive the shell + a Session-shaped user object for Topbar's UserMenu.
  const shell: 'ADMIN' | 'MEMBER' = role === 'ADMIN' ? 'ADMIN' : 'MEMBER';
  const user = (userName || userEmail) ? {
    name: userName ?? null,
    email: userEmail ?? null,
    role,
  } : undefined;

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
      />

      <div className={styles.mainWrapper}>
        <Topbar
          shell={shell}
          user={user}
          isSidebarOpen={isSidebarOpen}
          onMenuClick={() => setIsSidebarOpen(true)}
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
