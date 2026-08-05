/**
 * breadcrumb-map — static route → title map for Topbar breadcrumbs + command palette.
 *
 * Phase 3 of ADMIN_DASHBOARD_REDESIGN_PLAN.md.
 *
 * Keys are pathnames (no query string). The longest matching key wins, so
 * `/admin/users/123` resolves against `/admin/users` first. Dynamic `[id]`
 * segments fall back to their parent label with a synthesized "Detail"
 * crumb added by the caller.
 *
 * The map intentionally covers BOTH admin and member shells — the active
 * Topbar picks the entry whose prefix matches the current pathname.
 */

export interface Crumb {
  label: string;
  href?: string;
}

/** Static segment → label lookup. Order does not matter; longest match wins. */
export const ROUTE_TITLES: Record<string, string> = {
  // Admin shell
  "/admin": "Admin",
  "/admin/dashboard": "Dashboard",
  "/admin/requests": "Tutor Requests",
  "/admin/users": "Users",
  "/admin/withdrawals": "Withdrawals",
  "/admin/wallets": "Wallets",
  "/admin/consultancy": "Consultancy",
  "/admin/expertises": "Course Expertises",
  "/admin/support": "Support Tickets",
  "/admin/departments": "Departments",
  "/admin/courses": "Courses",
  "/admin/coupons": "Coupons",
  "/admin/settings": "Settings",
  "/admin/visitors": "Visitors",
  "/admin/profile": "Profile",

  // Member shell
  "/dashboard": "Dashboard",
  "/wallet": "Money",
  "/find-tutor": "Find a Tutor",
  "/student/request-tutor": "Tuition Requests",
  "/student/payments": "Payments",
  "/tutor/expertise": "Offer Course",
  "/tutor/earnings": "Earnings",
  "/consultancy": "Consultancy",
  "/contact": "Contact Support",
  "/profile": "My Profile",
};

/** Root crumb per shell — used as the first breadcrumb. */
export const SHELL_ROOT: Record<"ADMIN" | "MEMBER", Crumb> = {
  ADMIN: { label: "Admin", href: "/admin/dashboard" },
  MEMBER: { label: "Dashboard", href: "/dashboard" },
};

/**
 * Resolve a pathname into an ordered list of breadcrumbs.
 *
 * Strategy: walk path segments from the shell root down to the leaf,
 * looking each prefix up in ROUTE_TITLES. Unknown segments inherit the
 * nearest known ancestor label. The leaf crumb has no `href` (it's the
 * current page).
 *
 * Example: `/admin/users/123` →
 *   [Admin → /admin/dashboard, Users → /admin/users, Detail]
 */
export function buildBreadcrumbs(
  pathname: string,
  shell: "ADMIN" | "MEMBER",
): Crumb[] {
  const root = SHELL_ROOT[shell];
  const rootPrefix = shell === "ADMIN" ? "/admin" : "";

  // For the member shell we only build a trail when the path is one we
  // recognize (dashboard / wallet / profile / …). Public marketing routes
  // don't use the shell, so they never reach here.
  if (shell === "ADMIN" && !pathname.startsWith("/admin")) return [];
  if (shell === "MEMBER" && rootPrefix && !pathname.startsWith(rootPrefix)) {
    // member routes aren't all under a common prefix; just walk from "/"
  }

  const crumbs: Crumb[] = [{ label: root.label, href: root.href }];

  // Split the path below the shell root and walk downward.
  const segments = pathname.split("/").filter(Boolean);

  // Determine starting index based on shell root prefix.
  let startIdx = 0;
  if (shell === "ADMIN") startIdx = 1; // skip "admin"
  // member shell: no fixed prefix, start at 0

  let prefix = shell === "ADMIN" ? "/admin" : "";
  let foundAnyKnown = false;

  for (let i = startIdx; i < segments.length; i++) {
    const seg = segments[i];
    prefix = `${prefix}/${seg}`;
    const isLeaf = i === segments.length - 1;
    const known = ROUTE_TITLES[prefix];

    if (known) {
      crumbs.push({ label: known, href: isLeaf ? undefined : prefix });
      foundAnyKnown = true;
    } else if (foundAnyKnown || crumbs.length > 1) {
      // Dynamic segment under a known parent (e.g. [id]) — synthesize a leaf.
      // Heuristic: if the segment looks like an ID (long, numeric, or cuid),
      // label it "Detail"; otherwise title-case it.
      const looksLikeId =
        /^\d+$/.test(seg) || seg.length >= 12 || /^[a-z0-9]{20,}$/i.test(seg);
      crumbs.push({
        label: looksLikeId ? "Detail" : seg.replace(/-/g, " "),
        href: isLeaf ? undefined : prefix,
      });
    }
  }

  // De-duplicate trailing identical labels (e.g. Admin → Admin).
  const deduped: Crumb[] = [];
  for (const c of crumbs) {
    const prev = deduped[deduped.length - 1];
    if (!prev || prev.label !== c.label) deduped.push(c);
  }
  return deduped;
}
