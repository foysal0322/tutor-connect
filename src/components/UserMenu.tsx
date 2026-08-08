'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { ChevronDown, LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import type { Session } from 'next-auth';
import styles from './UserMenu.module.css';

type Role = 'STUDENT' | 'TUTOR' | 'ADMIN';

interface UserMenuProps {
  user: Session['user'];
  /** "popover" = desktop trigger + dropdown; "inline" = always-open list for the mobile drawer. */
  variant?: 'popover' | 'inline';
  /** Called after a menu item is activated (used to close the mobile drawer). */
  onNavigate?: () => void;
  /**
   * Data-derived tutor capability flag (any TutorExpertise row exists).
   * When true AND role is a non-admin member, a "Tutor" capability chip is
   * rendered beside the role chip. Purely presentational.
   */
  isTutor?: boolean;
}

const ROLE_LABEL: Record<Role, string> = {
  STUDENT: 'Member',
  TUTOR: 'Member',
  ADMIN: 'Administrator',
};

function getInitials(name?: string | null): string {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dashboardHref(role: Role): string {
  return role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';
}

function profileHref(role: Role): string {
  return role === 'ADMIN' ? '/admin/profile' : '/profile';
}

export default function UserMenu({ user, variant = 'popover', onNavigate, isTutor }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const role = (user?.role ?? 'STUDENT') as Role;
  const name = user?.name ?? null;
  const email = user?.email ?? null;

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Close on outside click (popover variant only).
  useEffect(() => {
    if (variant !== 'popover') return;
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleFocusOut(e: FocusEvent) {
      // Close if focus leaves the menu entirely.
      if (containerRef.current && !containerRef.current.contains(e.relatedTarget as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('focusin', handleFocusOut);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('focusin', handleFocusOut);
    };
  }, [variant]);

  // Restore focus to the trigger when the menu closes via keyboard.
  useEffect(() => {
    if (variant !== 'popover') return;
    if (!isOpen) {
      // Nothing to do on initial mount (trigger already has focus flow).
      return;
    }
  }, [isOpen, variant]);

  const handleTriggerKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      // Focus first menu item after render.
      requestAnimationFrame(() => {
        const first = menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
        first?.focus();
      });
    }
  };

  const handleMenuKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
      );
      if (items.length === 0) return;
      const idx = items.findIndex((el) => el === document.activeElement);
      const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      items[next].focus();
    }
  };

  const initials = getInitials(name);
  // Capability flag — only meaningful for non-admin members. Admins get the
  // full Administrator chip and don't need a separate capability label.
  const showTutorCapability = isTutor && role !== 'ADMIN';

  // ---------------- Inline (mobile drawer) ----------------
  if (variant === 'inline') {
    return (
      <div className={styles.inline}>
        <div className={styles.header}>
          <span className={styles.avatar} aria-hidden="true">{initials}</span>
          <div className={styles.headerText} style={{ minWidth: 0 }}>
            <span className={styles.headerName}>{name ?? 'Account'}</span>
            {email && <span className={styles.headerEmail}>{email}</span>}
            <span className={styles.roleChip}>{ROLE_LABEL[role]}</span>
            {showTutorCapability && (
              <span className={styles.capabilityChip} title="You can teach on this platform">
                Tutor
              </span>
            )}
          </div>
        </div>
        <div className={styles.inlineLinks}>
          <Link href={dashboardHref(role)} className={styles.inlineItem} onClick={onNavigate}>
            <LayoutDashboard size={18} aria-hidden="true" />
            Dashboard
          </Link>
          <Link href={profileHref(role)} className={styles.inlineItem} onClick={onNavigate}>
            <UserIcon size={18} aria-hidden="true" />
            View Profile
          </Link>
          <Link
            href="/auth/force-signout?reason=manual"
            className={`${styles.inlineItem} ${styles.dangerItem}`}
            onClick={onNavigate}
          >
            <LogOut size={18} aria-hidden="true" />
            Sign out
          </Link>
        </div>
      </div>
    );
  }

  // ---------------- Popover (desktop) ----------------
  return (
    <div className={styles.container} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setIsOpen((v) => !v)}
        onKeyDown={handleTriggerKey}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="user-menu"
      >
        <span className={styles.avatar} aria-hidden="true">{initials}</span>
        <span className={styles.triggerName}>{name ?? 'Account'}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={isOpen ? styles.chevronOpen : styles.chevron}
        />
      </button>

      {isOpen && (
        <div
          id="user-menu"
          ref={menuRef}
          role="menu"
          className={styles.menu}
          aria-label="Account menu"
          onKeyDown={handleMenuKey}
        >
          <div className={styles.header}>
            <span className={styles.avatarLg} aria-hidden="true">{initials}</span>
            <div className={styles.headerText} style={{ minWidth: 0 }}>
              <span className={styles.headerName}>{name ?? 'Account'}</span>
              {email && <span className={styles.headerEmail}>{email}</span>}
              <span className={styles.roleChip}>{ROLE_LABEL[role]}</span>
              {showTutorCapability && (
                <span className={styles.capabilityChip} title="You can teach on this platform">
                  Tutor
                </span>
              )}
            </div>
          </div>

          <div className={styles.separator} role="presentation" />

          <Link
            href={dashboardHref(role)}
            role="menuitem"
            className={styles.item}
            onClick={close}
          >
            <LayoutDashboard size={18} aria-hidden="true" />
            <span>Dashboard</span>
          </Link>
          <Link
            href={profileHref(role)}
            role="menuitem"
            className={styles.item}
            onClick={close}
          >
            <UserIcon size={18} aria-hidden="true" />
            <span>View Profile</span>
          </Link>

          <div className={styles.separator} role="presentation" />

          <Link
            href="/auth/force-signout?reason=manual"
            role="menuitem"
            className={`${styles.item} ${styles.dangerItem}`}
            onClick={close}
          >
            <LogOut size={18} aria-hidden="true" />
            <span>Sign out</span>
          </Link>
        </div>
      )}
    </div>
  );
}
