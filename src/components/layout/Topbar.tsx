"use client";

/**
 * Topbar — sticky 48 px top bar (Phase 3 + Phase 4).
 *
 * Anatomy:
 *   [≡/☰ toggle] [breadcrumb]                [⌘K] [🔔] [🌙] [👤 UserMenu]
 *
 * Behavior:
 *  - Mobile: hamburger opens the off-canvas sidebar (onMenuClick).
 *  - Desktop: collapse-to-rail toggle flips `isCollapsed` (owned by
 *    DashboardLayout, persisted there to localStorage).
 *  - Breadcrumbs derived from the pathname + route→title map.
 *  - ⌘K / Ctrl+K opens the <CommandPalette>.
 *  - Theme toggle flips ThemeProvider between light/dark (persisted there).
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Moon,
  Sun,
  RotateCw,
  ArrowUpToLine,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CommandPalette, type CommandItem } from "@/components/ui/CommandPalette";
import { useTheme } from "@/components/ThemeProvider";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import NotificationBell from "@/components/NotificationBell";
import UserMenu from "@/components/UserMenu";
import { buildBreadcrumbs, ROUTE_TITLES } from "./breadcrumb-map";
import { ADMIN_NAV } from "./admin-nav";
import { MEMBER_NAV } from "./member-nav";
import { pushRecentRoute, readRecentRoutes } from "./recent-routes";
import styles from "./layout.module.css";

export interface TopbarProps {
  /** "ADMIN" or "MEMBER" — controls breadcrumb root + command palette scope. */
  shell: "ADMIN" | "MEMBER";
  /** Minimal user shape for <UserMenu>. */
  user?: {
    name?: string | null;
    email?: string | null;
    role?: "STUDENT" | "TUTOR" | "ADMIN";
  };
  /** Mobile sidebar open state — toggle is hidden on desktop. */
  isSidebarOpen: boolean;
  onMenuClick: () => void;
  /** Desktop icon-rail collapse state (Phase 4). */
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Topbar({
  shell,
  user,
  isSidebarOpen,
  onMenuClick,
  isCollapsed,
  onToggleCollapse,
}: TopbarProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [recentTick, setRecentTick] = useState(0);

  // ⌘K / Ctrl+K opens the palette from anywhere in the shell.
  const openPalette = useCallback(() => {
    setRecentTick((n) => n + 1); // refresh recents from sessionStorage
    setPaletteOpen(true);
  }, []);
  useKeyboardShortcut({ key: "k", meta: true }, openPalette);

  const crumbs = useMemo(
    () => buildBreadcrumbs(pathname, shell),
    [pathname, shell],
  );

  // Track recently-visited routes for the command palette. The effect runs
  // after navigation commits so sessionStorage stays in sync with the URL.
  useEffect(() => {
    if (pathname) pushRecentRoute(pathname);
  }, [pathname]);

  // Flatten the active shell's nav config so each palette entry carries its
  // icon (Phase 9). Falls back to ROUTE_TITLES entries that aren't in the
  // sidebar config (e.g. /admin/users/[id]) without an icon.
  const navConfig = shell === "ADMIN" ? ADMIN_NAV : MEMBER_NAV;
  const navItems: CommandItem[] = useMemo(() => {
    const fromConfig: CommandItem[] = [];
    const seenHrefs = new Set<string>();
    for (const group of navConfig) {
      for (const item of group.items) {
        if (item.id === "logout") continue; // surfaced as a standalone action
        if (seenHrefs.has(item.href)) continue;
        seenHrefs.add(item.href);
        const Icon = item.icon;
        fromConfig.push({
          id: `nav-${item.id}`,
          label: item.label,
          group: group.heading ?? (shell === "ADMIN" ? "Operations" : "Navigate"),
          keywords: item.href,
          icon: <Icon size={14} aria-hidden="true" />,
          onSelect: () => router.push(item.href),
        });
      }
    }

    // Static fallback: routes known to breadcrumb-map but not to the nav
    // config (detail pages, edge cases). No icon, but still searchable.
    const shellPrefix = shell === "ADMIN" ? "/admin" : "";
    for (const [href, label] of Object.entries(ROUTE_TITLES)) {
      if (seenHrefs.has(href)) continue;
      if (shell === "ADMIN" && !href.startsWith(shellPrefix)) continue;
      if (shell === "MEMBER" && href.startsWith("/admin")) continue;
      fromConfig.push({
        id: `nav-route-${href}`,
        label,
        group: shell === "ADMIN" ? "More" : "Navigate",
        keywords: href,
        onSelect: () => router.push(href),
      });
    }
    return fromConfig;
  }, [navConfig, shell, router]);

  // Recently-visited group (Phase 9). Re-read on each palette open so the
  // list reflects where the user has been this session. `recentTick` busts
  // the memo each time the palette opens; pathname keeps it current-route
  // aware.
  const recentItems: CommandItem[] = useMemo(() => {
    if (typeof window === "undefined") return [];
    void recentTick; // refresh trigger (see openPalette)
    const routes = readRecentRoutes(pathname, 5);
    return routes.map((href, idx) => {
      const label = ROUTE_TITLES[href] ?? href.split("/").filter(Boolean).pop() ?? href;
      return {
        id: `recent-${idx}-${href}`,
        label,
        group: "Recently Visited",
        keywords: href,
        onSelect: () => router.push(href),
      };
    });
  }, [pathname, recentTick, router]);

  // Shell-level actions. Page-scoped commands (filter-by-role, etc.) are
  // deferred to Phase 12 — they require URL-driven filter state, which the
  // list pages don't currently use.
  const actionItems: CommandItem[] = useMemo(() => [
    {
      id: "action-toggle-theme",
      label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      group: "Actions",
      icon: theme === "dark" ? <Sun size={14} aria-hidden="true" /> : <Moon size={14} aria-hidden="true" />,
      onSelect: toggleTheme,
    },
    {
      id: "action-refresh",
      label: "Refresh current page",
      group: "Actions",
      icon: <RotateCw size={14} aria-hidden="true" />,
      keywords: "reload",
      onSelect: () => router.refresh(),
    },
    {
      id: "action-scroll-top",
      label: "Scroll to top",
      group: "Actions",
      icon: <ArrowUpToLine size={14} aria-hidden="true" />,
      onSelect: () => {
        if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      },
    },
    {
      id: "action-sign-out",
      label: "Sign out",
      group: "Actions",
      onSelect: () => router.push("/auth/force-signout?reason=manual"),
    },
  ], [theme, toggleTheme, router]);

  const commandItems: CommandItem[] = useMemo(
    () => [...recentItems, ...navItems, ...actionItems],
    [recentItems, navItems, actionItems],
  );

  return (
    <>
      <header className={styles.topbar} data-shell={shell}>
        <div className={styles.topbarLeft}>
          {/* Mobile: hamburger to open the off-canvas sidebar. */}
          <button
            type="button"
            className={`${styles.iconButton} ${styles.menuToggle}`}
            onClick={onMenuClick}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            aria-expanded={isSidebarOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>

          {/* Desktop: collapse-to-rail toggle. Icon flips with state. */}
          <button
            type="button"
            className={`${styles.iconButton} ${styles.collapseToggle}`}
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={isCollapsed}
          >
            {isCollapsed ? (
              <PanelLeftOpen size={18} aria-hidden="true" />
            ) : (
              <PanelLeftClose size={18} aria-hidden="true" />
            )}
          </button>

          <Breadcrumb items={crumbs} className={styles.breadcrumb} />
        </div>

        <div className={styles.topbarRight}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.kbutton}`}
            onClick={openPalette}
            aria-label="Open command palette"
            title="Search pages and actions (Ctrl+K)"
          >
            <Search size={16} aria-hidden="true" />
            <kbd className={styles.kbd}>⌘K</kbd>
          </button>

          <span className={styles.topbarDivider} aria-hidden="true" />

          <NotificationBell />

          <button
            type="button"
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label={
              theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
            }
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun size={18} aria-hidden="true" />
            ) : (
              <Moon size={18} aria-hidden="true" />
            )}
          </button>

          {user && (
            // UserMenu only reads { name, email, role } — see UserMenu.tsx:47-49.
            <UserMenu user={user as any} variant="popover" />
          )}
        </div>
      </header>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        items={commandItems}
      />
    </>
  );
}
