'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from '../dashboard.module.css';

export default function TutorSidebar({ userName }: { userName?: string | null }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  return (
    <>
      <button className={styles.menuToggleBtn} onClick={() => setSidebarOpen(true)} aria-label="Open Menu">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {sidebarOpen && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 999 }} 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', padding: '0 1rem' }}>
          <div>
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>Tutor Portal</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{userName}</p>
          </div>
          {sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-main)', display: 'block', fontSize: '1.5rem', lineHeight: 1 }}
            >
              &times;
            </button>
          )}
        </div>
        
        <Link href="/tutor" className={`${styles.navLink} ${pathname === '/tutor' ? styles.navLinkActive : ''}`}>Dashboard</Link>
        <Link href="/tutor/expertise" className={`${styles.navLink} ${pathname === '/tutor/expertise' ? styles.navLinkActive : ''}`}>My Expertise</Link>
        <Link href="/tutor/earnings" className={`${styles.navLink} ${pathname === '/tutor/earnings' ? styles.navLinkActive : ''}`}>Earnings & Withdrawals</Link>
        <Link href="/tutor/profile" className={`${styles.navLink} ${pathname === '/tutor/profile' ? styles.navLinkActive : ''}`}>My Profile</Link>
        <Link href="/api/auth/signout" className={styles.navLink} style={{ marginTop: 'auto', color: 'var(--error)' }}>Sign Out</Link>
      </aside>
    </>
  );
}
