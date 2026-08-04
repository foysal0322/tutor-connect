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

  // ⌘K / Ctrl+K opens the palette from anywhere in the shell.
  useKeyboardShortcut({ key: "k", meta: true }, () => setPaletteOpen(true));

  const crumbs = useMemo(
    () => buildBreadcrumbs(pathname, shell),
    [pathname, shell],
  );

  // Command palette items — derived from the static route map. Phase 9 will
  // layer in per-page commands.
  const commandItems: CommandItem[] = useMemo(() => {
    const navItems: CommandItem[] = Object.entries(ROUTE_TITLES)
      .filter(([href]) =>
        shell === "ADMIN"
          ? href.startsWith("/admin")
          : !href.startsWith("/admin"),
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
        label:
          theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
        group: "Actions",
        onSelect: toggleTheme,
      },
      {
        id: "action-sign-out",
        label: "Sign out",
        group: "Actions",
        onSelect: () => router.push("/auth/force-signout?reason=manual"),
      },
    ];

    return [...navItems, ...actions];
  }, [shell, router, theme, toggleTheme]);

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
