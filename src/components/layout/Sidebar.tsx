'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  BookOpen,
  GraduationCap,
  Calendar,
  MessageSquare,
  LogOut,
  CreditCard,
  Briefcase,
  DollarSign,
  Users,
  Eye,
  LifeBuoy,
} from 'lucide-react';
import styles from './layout.module.css';

type SidebarProps = {
  role: 'ADMIN' | 'STUDENT' | 'TUTOR';
  isOpen: boolean;
  onClose: () => void;
  currentCounts?: any;
};

export default function Sidebar({ role, isOpen, onClose, currentCounts }: SidebarProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [seenCounts, setSeenCounts] = useState<any>({});

  // Badge Logic — admin (admin counts) and members (paymentsDue, student or tutor).
  const badgeStorageKey = role === 'ADMIN' ? 'adminSeenCounts' : 'studentSeenCounts';
  useEffect(() => {
    if (!currentCounts) return;

    const saved = localStorage.getItem(badgeStorageKey);
    if (saved) {
      try {
        setSeenCounts(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    } else {
      setSeenCounts(currentCounts);
      localStorage.setItem(badgeStorageKey, JSON.stringify(currentCounts));
    }
    setIsMounted(true);
  }, [currentCounts, role, badgeStorageKey]);

  useEffect(() => {
    if (!currentCounts) return;

    let keyToUpdate: string | null = null;
    if (role === 'ADMIN') {
      if (pathname === '/admin/requests') keyToUpdate = 'requests';
      if (pathname === '/admin/withdrawals') keyToUpdate = 'withdrawals';
      if (pathname === '/admin/users') keyToUpdate = 'users';
      if (pathname === '/admin/support') keyToUpdate = 'support';
      if (pathname === '/admin/departments') keyToUpdate = 'departments';
      if (pathname === '/admin/courses') keyToUpdate = 'courses';
      if (pathname === '/admin/expertises') keyToUpdate = 'expertises';
    } else {
      // Member (student or tutor): visiting the Payments page marks pending
      // payments as seen.
      if (pathname === '/student/payments') keyToUpdate = 'paymentsDue';
    }

    if (keyToUpdate) {
      setSeenCounts((prev: any) => {
        if (prev[keyToUpdate as string] !== currentCounts[keyToUpdate as string]) {
          const updated = { ...prev, [keyToUpdate as string]: currentCounts[keyToUpdate as string] };
          localStorage.setItem(badgeStorageKey, JSON.stringify(updated));
          return updated;
        }
        return prev;
      });
    }
  }, [pathname, currentCounts, role, badgeStorageKey]);

  const getBadge = (key: string) => {
    if (!isMounted || !currentCounts) return null;

    // Actionable keys show the absolute pending count (red); others show the
    // delta since last visit (primary). paymentsDue = payments owed by a student.
    const actionableKeys = ['requests', 'withdrawals', 'support', 'refunds', 'consultancy', 'paymentsDue'];
    
    if (actionableKeys.includes(key)) {
      // For actionable items, show absolute pending count
      const count = currentCounts[key] || 0;
      if (count > 0) {
        return <span className={styles.navBadge}>{count}</span>;
      }
    } else {
      // For non-actionable items, show difference (new items since last visit)
      const diff = (currentCounts[key] || 0) - (seenCounts[key] || 0);
      if (diff > 0) {
        return <span className={`${styles.navBadge} ${styles.navBadgePrimary}`}>{diff}</span>;
      }
    }
    return null;
  };

  const getGroups = () => {
    if (role === 'ADMIN') {
      return [
        {
          heading: null,
          links: [
            { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
            { name: 'Tutor Requests', href: '/admin/requests', icon: BookOpen, badgeKey: 'requests' },
            { name: 'Users', href: '/admin/users', icon: Users, badgeKey: 'users' },
            { name: 'Withdrawals', href: '/admin/withdrawals', icon: DollarSign, badgeKey: 'withdrawals' },
            { name: 'Course Expertises', href: '/admin/expertises', icon: Briefcase, badgeKey: 'expertises' },
            { name: 'Support Tickets', href: '/admin/support', icon: LifeBuoy, badgeKey: 'support' },
            { name: 'Manage Departments', href: '/admin/departments', icon: GraduationCap, badgeKey: 'departments' },
            { name: 'Manage Courses', href: '/admin/courses', icon: BookOpen, badgeKey: 'courses' },
            { name: 'Visitors', href: '/admin/visitors', icon: Eye },
            { name: 'Profile', href: '/admin/profile', icon: User },
          ],
        },
      ];
    }
    // STUDENT and TUTOR share the same nav — every member can both learn and teach.
    // Dashboard is unified (covers both roles) so it sits outside Learning/Teaching.
    return [
      {
        heading: null,
        links: [
          { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        ],
      },
      {
        heading: 'Learning',
        links: [
          { name: 'Find a Tutor', href: '/find-tutor', icon: BookOpen },
          { name: 'Tuition Requests', href: '/student/request-tutor', icon: Calendar },
          { name: 'Payments', href: '/student/payments', icon: CreditCard, badgeKey: 'paymentsDue' },
        ],
      },
      {
        heading: 'Teaching',
        links: [
          { name: 'Offer Course', href: '/tutor/expertise', icon: GraduationCap },
          { name: 'Earnings & Withdrawals', href: '/tutor/earnings', icon: DollarSign },
        ],
      },
      {
        heading: 'Account',
        links: [
          { name: 'My Wallet', href: '/wallet', icon: CreditCard },
          { name: 'Consultancy', href: '/consultancy', icon: MessageSquare },
          { name: 'My Profile', href: '/profile', icon: User },
        ],
      },
    ];
  };

  const groups = getGroups();

  return (
    <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarHeader}>
        <div className="flex items-center gap-2">
          <GraduationCap className="text-primary" size={28} />
          <span>nsuOne</span>
        </div>
      </div>
      
      <nav className={styles.sidebarNav}>
        {groups.map((group, gi) => (
          <div key={group.heading ?? `group-${gi}`} className={styles.navGroup}>
            {group.heading && <div className={styles.navHeading}>{group.heading}</div>}
            {group.links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              const isExactActive = pathname === link.href;

              const isCurrent = link.href.split('/').length > 2 ? isActive : isExactActive;

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => {
                    if (window.innerWidth <= 1024) onClose();
                  }}
                  className={`${styles.navItem} ${isCurrent ? styles.active : ''}`}
                  suppressHydrationWarning
                >
                  <Icon size={20} className={styles.navItemIcon} />
                  {link.name}
                  {(link as any).badgeKey && getBadge((link as any).badgeKey)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className={styles.sidebarFooter}>
        <Link href="/auth/force-signout?reason=manual" className={styles.navItem}>
          <LogOut size={20} className={styles.navItemIcon} />
          Logout
        </Link>
      </div>
    </aside>
  );
}
