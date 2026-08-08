/**
 * member-nav — config-driven sidebar for the unified STUDENT/TUTOR shell (Phase 4).
 *
 * Both member roles share the same nav (every member can learn AND teach).
 * Mirrors ADMIN_NAV's shape so Sidebar.tsx can render either with one code path.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  BookOpen,
  Calendar,
  GraduationCap,
  MessageSquare,
  Store,
  ShoppingBag,
  Bookmark,
  Scale,
  Tag,
  User,
  Wallet,
  LogOut,
} from "lucide-react";
import type { NavGroup } from "./admin-nav";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
  danger?: boolean;
}

export const MEMBER_NAV: NavGroup[] = [
  {
    heading: null,
    items: [
      { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      // Unified Money hub — carries the payments-due badge so members still
      // get pinged about action (Policy #35).
      { id: "money", label: "Money", href: "/wallet", icon: Wallet, badgeKey: "paymentsDue" },
    ],
  },
  {
    heading: "Learning",
    items: [
      { id: "find-tutor", label: "Find a Tutor", href: "/find-tutor", icon: BookOpen },
      { id: "request-tutor", label: "Tuition Requests", href: "/student/request-tutor", icon: Calendar },
    ],
  },
  {
    heading: "Teaching",
    items: [
      { id: "offer-course", label: "Offer Course", href: "/tutor/expertise", icon: GraduationCap },
    ],
  },
  {
    heading: "Shop",
    items: [
      { id: "shop-browse", label: "Browse Shop", href: "/shop", icon: Store },
      { id: "shop-selling", label: "Selling", href: "/shop/selling", icon: Tag },
      { id: "shop-orders", label: "My Orders", href: "/shop/orders", icon: ShoppingBag },
      { id: "shop-saved", label: "Saved", href: "/shop/saved", icon: Bookmark },
      { id: "shop-disputes", label: "Issues", href: "/shop/disputes", icon: Scale },
    ],
  },
  {
    heading: "Account",
    items: [
      { id: "consultancy", label: "Consultancy", href: "/consultancy", icon: MessageSquare },
      { id: "profile", label: "My Profile", href: "/profile", icon: User },
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
