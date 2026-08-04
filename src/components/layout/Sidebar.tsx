'use client';

/**
 * Sidebar — config-driven admin/member navigation (Phase 4 redesign).
 *
 * Renders from ADMIN_NAV or MEMBER_NAV. Behaviors preserved from the
 * pre-redesign sidebar:
 *   - Count badges (actionable keys show absolute pending count in red;
 *     non-actionable keys show the delta since last visit in primary).
 *   - seenCounts persisted to localStorage ("adminSeenCounts" /
 *     "studentSeenCounts"); visiting a page marks its badgeKey as seen.
 *   - Active link detection: prefix-match for deep routes, exact match
 *     for shallow roots (preserves the original 3-segment heuristic).
 *
 * New in Phase 4:
 *   - Collapse-to-rail mode (driven by the `collapsed` prop set in
 *     DashboardLayout; labels/headings/search hidden, icons centered).
 *   - In-sidebar search input (filter items by label; expanded only).
 *   - Keyboard navigation: Arrow Up/Down, Home, End, Enter within the nav.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { ADMIN_NAV, type NavItem } from './admin-nav';
import { MEMBER_NAV } from './member-nav';
import styles from './layout.module.css';

type SidebarProps = {
  role: 'ADMIN' | 'STUDENT' | 'TUTOR';
  isOpen: boolean;
  onClose: () => void;
  currentCounts?: any;
  /** Desktop icon-rail collapse (Phase 4). Mobile drawer ignores this. */
  collapsed?: boolean;
};

// Actionable keys show the absolute pending count (red); others show the
// delta since last visit (primary). Kept identical to the pre-redesign list.
const ACTIONABLE_KEYS = [
  'requests',
  'withdrawals',
  'support',
  'refunds',
  'consultancy',
  'paymentsDue',
];

export default function Sidebar({
  role,
  isOpen,
  onClose,
  currentCounts,
  collapsed = false,
}: SidebarProps) {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const [seenCounts, setSeenCounts] = useState<any>({});
  const [query, setQuery] = useState('');
  const navRef = useRef<HTMLElement>(null);

  const groups = role === 'ADMIN' ? ADMIN_NAV : MEMBER_NAV;
  const badgeStorageKey =
    role === 'ADMIN' ? 'adminSeenCounts' : 'studentSeenCounts';

  // ---- Badge hydration: read persisted seen-counts on mount -------------
  useEffect(() => {
    if (!currentCounts) return;

    const saved = localStorage.getItem(badgeStorageKey);
    if (saved) {
      try {
        setSeenCounts(JSON.parse(saved));
      } catch {
        // ignore corrupt JSON
      }
    } else {
      setSeenCounts(currentCounts);
      localStorage.setItem(badgeStorageKey, JSON.stringify(currentCounts));
    }
    setIsMounted(true);
  }, [currentCounts, role, badgeStorageKey]);

  // ---- Mark-as-seen: visiting a page updates seenCounts for non-actionable
  // badgeKeys (actionable keys show absolute counts, so seen-state is N/A).
  // Derived from config — produces the exact same key→pathname mapping the
  // hard-coded version used (requests, withdrawals, users, support,
  // departments, courses, expertises).
  useEffect(() => {
    if (!currentCounts) return;

    const visibleItems = groups.flatMap((g) => g.items);
    const matched = visibleItems.find(
      (it) =>
        it.badgeKey &&
        !ACTIONABLE_KEYS.includes(it.badgeKey) &&
        pathname === it.href,
    );
    if (!matched || !matched.badgeKey) return;

    const keyToUpdate = matched.badgeKey;
    setSeenCounts((prev: any) => {
      if (prev[keyToUpdate] !== currentCounts[keyToUpdate]) {
        const updated = {
          ...prev,
          [keyToUpdate]: currentCounts[keyToUpdate],
        };
        localStorage.setItem(badgeStorageKey, JSON.stringify(updated));
        return updated;
      }
      return prev;
    });
  }, [pathname, currentCounts, role, badgeStorageKey, groups]);

  const getBadge = (key?: string) => {
    if (!key) return null;
    if (!isMounted || !currentCounts) return null;

    if (ACTIONABLE_KEYS.includes(key)) {
      const count = currentCounts[key] || 0;
      if (count > 0) {
        return <span className={styles.navBadge}>{count}</span>;
      }
    } else {
      const diff = (currentCounts[key] || 0) - (seenCounts[key] || 0);
      if (diff > 0) {
        return (
          <span className={`${styles.navBadge} ${styles.navBadgePrimary}`}>
            {diff}
          </span>
        );
      }
    }
    return null;
  };

  // ---- Search: filter items by label (case-insensitive) -----------------
  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        items: g.items.filter((it) =>
          it.label.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [groups, query]);

  // ---- Keyboard nav: Arrow/Home/End over the rendered link list ---------
  const getFocusableLinks = (): HTMLAnchorElement[] => {
    if (!navRef.current) return [];
    return Array.from(
      navRef.current.querySelectorAll<HTMLAnchorElement>('a[data-nav-id]'),
    ).filter((a) => a.offsetParent !== null); // skip hidden (collapsed labels)
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const links = getFocusableLinks();
    if (links.length === 0) return;
    const currentIdx = links.findIndex((a) => a === document.activeElement);
    let nextIdx = currentIdx;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIdx = currentIdx < 0 ? 0 : (currentIdx + 1) % links.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIdx =
        currentIdx <= 0 ? links.length - 1 : currentIdx - 1;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIdx = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIdx = links.length - 1;
    } else {
      return;
    }

    links[nextIdx]?.focus();
  };

  const isActive = (item: NavItem) => {
    const isActivePrefix =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    const isExact = pathname === item.href;
    // Preserve original heuristic: deep routes (≥3 segments) use prefix
    // match; shallow roots use exact match.
    return item.href.split('/').length > 2 ? isActivePrefix : isExact;
  };

  const showSearch = !collapsed;

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}
      data-collapsed={collapsed ? '1' : '0'}
    >
      {showSearch && (
        <div className={styles.sidebarSearch}>
          <Search size={14} aria-hidden="true" className={styles.sidebarSearchIcon} />
          <input
            type="text"
            placeholder="Filter navigation…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={styles.sidebarSearchInput}
            aria-label="Filter sidebar navigation"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className={styles.sidebarSearchClear}
              aria-label="Clear filter"
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      <nav
        ref={navRef}
        className={styles.sidebarNav}
        onKeyDown={onKeyDown}
        aria-label="Sidebar navigation"
      >
        {filteredGroups.length === 0 && (
          <div className={styles.sidebarEmpty}>No matches</div>
        )}

        {filteredGroups.map((group, gi) => {
          const showHeading = group.heading && !collapsed;
          return (
            <div
              key={group.heading ?? `group-${gi}`}
              className={styles.navGroup}
            >
              {showHeading && (
                <div className={styles.navHeading}>{group.heading}</div>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    data-nav-id={item.id}
                    onClick={() => {
                      if (window.innerWidth <= 1024) onClose();
                    }}
                    title={collapsed ? item.label : undefined}
                    className={`${styles.navItem} ${
                      item.danger ? styles.navItemDanger : ''
                    } ${active ? styles.active : ''}`}
                    suppressHydrationWarning
                  >
                    <Icon size={20} className={styles.navItemIcon} />
                    <span className={styles.navItemLabel}>{item.label}</span>
                    {getBadge(item.badgeKey)}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
