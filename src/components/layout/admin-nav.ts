/**
 * admin-nav — config-driven admin sidebar (Phase 4).
 *
 * Source of truth for the admin shell's navigation. Sidebar.tsx renders from
 * this array; the Topbar's command palette + breadcrumbs read from
 * ROUTE_TITLES in breadcrumb-map.ts (kept separate because breadcrumbs need
 * static labels even for routes that aren't in the sidebar, e.g. /admin/users/[id]).
 *
 * Groups follow the plan §15 layout:
 *   Operations → Catalog → Growth → System
 *
 * Adding a page = add an entry here. No edits to Sidebar.tsx required.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  CreditCard,
  MessageSquare,
  ShoppingBag,
  Briefcase,
  LifeBuoy,
  GraduationCap,
  TicketPercent,
  Settings,
  Eye,
  User,
  LogOut,
} from "lucide-react";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Key into Sidebar's currentCounts + seenCounts (drives the badge). */
  badgeKey?: string;
  /** Marks the row as a destructive action (red treatment). */
  danger?: boolean;
}

export interface NavGroup {
  heading: string | null;
  items: NavItem[];
}

export const ADMIN_NAV: NavGroup[] = [
  {
    heading: "Operations",
    items: [
      { id: "dashboard", label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { id: "requests", label: "Tutor Requests", href: "/admin/requests", icon: BookOpen, badgeKey: "requests" },
      { id: "users", label: "Users", href: "/admin/users", icon: Users, badgeKey: "users" },
      { id: "withdrawals", label: "Withdrawals", href: "/admin/withdrawals", icon: DollarSign, badgeKey: "withdrawals" },
      { id: "wallets", label: "Wallets", href: "/admin/wallets", icon: CreditCard },
      { id: "consultancy", label: "Consultancy", href: "/admin/consultancy", icon: MessageSquare, badgeKey: "consultancy" },
      { id: "support", label: "Support Tickets", href: "/admin/support", icon: LifeBuoy, badgeKey: "support" },
      { id: "shop", label: "Shop", href: "/admin/shop", icon: ShoppingBag },
    ],
  },
  {
    heading: "Catalog",
    items: [
      { id: "courses", label: "Manage Courses", href: "/admin/courses", icon: BookOpen, badgeKey: "courses" },
      { id: "departments", label: "Departments", href: "/admin/departments", icon: GraduationCap, badgeKey: "departments" },
      { id: "expertises", label: "Course Expertises", href: "/admin/expertises", icon: Briefcase, badgeKey: "expertises" },
    ],
  },
  {
    heading: "Growth",
    items: [
      { id: "coupons", label: "Coupons", href: "/admin/coupons", icon: TicketPercent },
      { id: "visitors", label: "Visitors", href: "/admin/visitors", icon: Eye },
    ],
  },
  {
    heading: "System",
    items: [
      { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings },
      { id: "profile", label: "Profile", href: "/admin/profile", icon: User },
      {
        id: "logout",
        label: "Logout",
        href: "/auth/force-signout?reason=manual",
        icon: LogOut,
        danger: true,
      },
    ],
  },
];
