'use client';

import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopNav from './TopNav';
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
        <TopNav 
          onMenuClick={() => setIsSidebarOpen(true)} 
          userName={userName}
          role={role}
        />
        <main className={styles.content}>
          <div className="container animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
