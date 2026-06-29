'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from '../dashboard.module.css';

interface Counts {
  requests: number;
  users: number;
  support: number;
  departments: number;
  courses: number;
  expertises: number;
  passwordResets: number;
}

export default function AdminSidebar({ currentCounts, userName }: { currentCounts: Counts, userName?: string | null }) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [seenCounts, setSeenCounts] = useState<Counts>({
    requests: 0,
    users: 0,
    support: 0,
    departments: 0,
    courses: 0,
    expertises: 0,
    passwordResets: 0
  });

  // Load seen counts from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('adminSeenCounts');
    if (saved) {
      try {
        setSeenCounts(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    } else {
      // Initialize with current counts so existing items don't show as new on first visit
      setSeenCounts(currentCounts);
      localStorage.setItem('adminSeenCounts', JSON.stringify(currentCounts));
    }
    setIsMounted(true);
  }, [currentCounts]);

  // Update seen count when visiting a path
  useEffect(() => {
    let keyToUpdate: keyof Counts | null = null;

    if (pathname === '/admin/requests') keyToUpdate = 'requests';
    if (pathname === '/admin/users') keyToUpdate = 'users';
    if (pathname === '/admin/support') keyToUpdate = 'support';
    if (pathname === '/admin/departments') keyToUpdate = 'departments';
    if (pathname === '/admin/courses') keyToUpdate = 'courses';
    if (pathname === '/admin/expertises') keyToUpdate = 'expertises';

    if (keyToUpdate) {
      setSeenCounts(prev => {
        if (prev[keyToUpdate as keyof Counts] !== currentCounts[keyToUpdate as keyof Counts]) {
          const updated = { ...prev, [keyToUpdate as keyof Counts]: currentCounts[keyToUpdate as keyof Counts] };
          localStorage.setItem('adminSeenCounts', JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }

    // Close sidebar on navigation on mobile
    setSidebarOpen(false);
  }, [pathname, currentCounts]);

  const getBadge = (key: keyof Counts) => {
    if (!isMounted) return null;
    const diff = currentCounts[key] - seenCounts[key];
    if (diff > 0) {
      return (
        <span style={{
          background: 'var(--error)',
          color: '#fff',
          fontSize: '0.7rem',
          padding: '0.1rem 0.4rem',
          borderRadius: '10px',
          marginLeft: 'auto',
          fontWeight: 'bold'
        }}>
          {diff}
        </span>
      );
    }
    return null;
  };

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
            <h3 style={{ color: 'var(--primary)', fontSize: '1.1rem' }}>Admin Portal</h3>
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

        <Link href="/admin/dashboard" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Dashboard
        </Link>
        <Link href="/admin/requests" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Tutor Requests {getBadge('requests')}
        </Link>
        <Link href="/admin/users" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Manage Users {getBadge('users')}
        </Link>
        <Link href="/admin/support" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Support & Feedback {getBadge('support')}
        </Link>
        <Link href="/admin/password-resets" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Password Resets {getBadge('passwordResets')}
        </Link>
        <Link href="/admin/departments" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Manage Departments {getBadge('departments')}
        </Link>
        <Link href="/admin/courses" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Manage Courses {getBadge('courses')}
        </Link>
        <Link href="/admin/expertises" className={styles.navLink} style={{ display: 'flex', alignItems: 'center' }}>
          Offered Courses {getBadge('expertises')}
        </Link>

        <Link href="/api/auth/signout" className={styles.navLink} style={{ marginTop: 'auto', color: 'var(--error)' }}>
          Sign Out
        </Link>
      </aside>
    </>
  );
}
