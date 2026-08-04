"use client";

/**
 * Topbar — sticky 48 px top bar that replaces the empty <TopNav/>.
 *
 * Phase 3 of ADMIN_DASHBOARD_REDESIGN_PLAN.md.
 *
 * Anatomy:
 *   [≡/☰ toggle] [breadcrumb]                [⌘K] [🔔] [🌙] [👤 UserMenu]
 *
 * Behavior:
 *  - Mobile: toggle button opens/closes the off-canvas sidebar (onMenuClick).
 *    The sidebar collapse-to-rail is a Phase 4 deliverable; here we only
 *    persist the user's intent so Phase 4 can read it on mount.
 *  - Breadcrumbs are derived from the current pathname via buildBreadcrumbs
 *    + the route→title map.
 *  - ⌘K / Ctrl+K opens the <CommandPalette>. Items are derived from the
 *    static route map; Phase 9 will wire richer per-page commands.
 *  - Theme toggle flips ThemeProvider between light/dark; persisted there.
 *  - NotificationBell + UserMenu are existing components, now wired in.
 *
 * Density: 48 px tall (was 64), 13 px label type, 16 px gutters.
 */

import React, { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Moon,
  Sun,
} from "lucide-react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { CommandPalette, type CommandItem } from "@/components/ui/CommandPalette";
import { useTheme } from "@/components/ThemeProvider";
import { useKeyboardShortcut } from "@/hooks/useKeyboardShortcut";
import NotificationBell from "@/components/NotificationBell";
import UserMenu from "@/components/UserMenu";
import { buildBreadcrumbs, ROUTE_TITLES } from "./breadcrumb-map";
import styles from "./layout.module.css";

export interface TopbarProps {
  /** "ADMIN" or "MEMBER" — controls breadcrumb root + command palette scope. */
  shell: "ADMIN" | "MEMBER";
  /** Minimal user shape for <UserMenu>. We accept a partial to avoid coupling
   *  Topbar to the full Session["user"] augmented type (id/nsuId are not
   *  needed for the avatar menu). */
  user?: {
    name?: string | null;
    email?: string | null;
    role?: "STUDENT" | "TUTOR" | "ADMIN";
  };
  /** Mobile sidebar open state — toggle is hidden on desktop. */
  isSidebarOpen: boolean;
  onMenuClick: () => void;
}

const COLLAPSE_KEY = "nsuone.sidebar.collapsed";

export default function Topbar({
  shell,
  user,
  isSidebarOpen,
  onMenuClick,
}: TopbarProps) {
  const pathname = usePathname() ?? "";
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K opens the palette from anywhere in the shell.
  useKeyboardShortcut({ key: "k", meta: true }, () => setPaletteOpen(true));

  const crumbs = useMemo(
    () => buildBreadcrumbs(pathname, shell),
    [pathname, shell],
  );

  // Command palette items — derived from the static route map so we don't
  // duplicate the nav config here (Phase 4 will centralize it).
  const commandItems: CommandItem[] = useMemo(() => {
    const prefix = shell === "ADMIN" ? "/admin" : "";
    const navItems: CommandItem[] = Object.entries(ROUTE_TITLES)
      .filter(([href]) =>
        shell === "ADMIN" ? href.startsWith("/admin") : !href.startsWith("/admin"),
      )
      .map(([href, label]) => ({
        id: `nav-${href}`,
        label,
        group: shell === "ADMIN" ? "Admin" : "Navigate",
        keywords: href,
        onSelect: () => router.push(href),
      }));

    const actions: CommandItem[] = [
      {
        id: "action-toggle-theme",
        label: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        group: "Actions",
        onSelect: toggleTheme,
      },
      {
        id: "action-sign-out",
        label: "Sign out",
        group: "Actions",
        onSelect: () =>
          router.push("/auth/force-signout?reason=manual"),
      },
    ];

    return [...navItems, ...actions];
  }, [shell, router, theme, toggleTheme]);

  // Persist collapse intent for Phase 4. The desktop rail toggle is hidden
  // on screens ≤ 1024 px (those use the off-canvas drawer instead).
  const toggleCollapse = () => {
    try {
      const current = window.localStorage.getItem(COLLAPSE_KEY) === "1";
      window.localStorage.setItem(COLLAPSE_KEY, current ? "0" : "1");
      // Toggle a class on <html> so Phase 4's CSS can read it; today this
      // is a no-op visually but keeps the contract stable.
      document.documentElement.dataset.sidebarCollapsed = current ? "0" : "1";
    } catch {
      /* ignore */
    }
  };

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

          {/* Desktop: collapse-to-rail toggle (Phase 4 will honor it visually). */}
          <button
            type="button"
            className={`${styles.iconButton} ${styles.collapseToggle}`}
            onClick={toggleCollapse}
            aria-label="Toggle sidebar"
            title="Collapse sidebar"
          >
            <PanelLeftOpen size={18} aria-hidden="true" data-icon="expand" />
            <PanelLeftClose size={18} aria-hidden="true" data-icon="collapse" />
          </button>

          <Breadcrumb items={crumbs} className={styles.breadcrumb} />
        </div>

        <div className={styles.topbarRight}>
          <button
            type="button"
            className={`${styles.iconButton} ${styles.kbutton}`}
            onClick={() => setPaletteOpen(true)}
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
              theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
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
            // Cast to the full Session["user"] type to satisfy its prop signature
            // without forcing every caller to construct id/nsuId.
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
