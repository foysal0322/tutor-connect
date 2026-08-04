import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Proxy (Next.js 16 rename of `middleware`) — pre-render routing rules.
 *
 * Phase 2 of ADMIN_DASHBOARD_REDESIGN_PLAN.md.
 *
 * Two cases, both additive on top of the existing layout-level guards
 * (requireRole in admin/layout.tsx is still the source of truth):
 *
 *   1. ADMIN user hitting `/` → skip the marketing site, go straight to
 *      `/admin/dashboard`. No flash of the landing page (this runs before
 *      any HTML is sent).
 *
 *   2. Anyone without the ADMIN role hitting `/admin/*` → redirect to
 *      `/auth/admin-signin?callbackUrl=<original>`. Today this redirect
 *      happens inside `admin/layout.tsx` via `requireRole(['ADMIN'], …)`;
 *      doing it here saves an RSC render round-trip.
 *
 * What this proxy does NOT do:
 *   - Block admins from other public pages (they may legitimately view
 *     /consultancy-policy, /refund-policy, etc.).
 *   - Replace the layout-level `requireRole` check. That stays as
 *     defense-in-depth.
 *   - Touch `/dashboard/*`, `/api/*`, `/student/*`, `/tutor/*`,
 *     `/wallet`, `/profile`. Those routes keep their existing auth
 *     semantics unchanged.
 *
 * Cookie note: src/lib/auth.ts sets a custom NextAuth cookie name
 * (`next-auth.session-token.tutor-connect`). NextAuth v4's getToken
 * accepts a `cookieName` override and uses it verbatim — no __Secure-
 * prefix is auto-added since the custom name is explicit. The same
 * name applies in dev and production.
 *
 * Runtime: Next.js 16 fixed the proxy runtime to `nodejs` (edge is not
 * supported in proxy). `next-auth/jwt` works on nodejs.
 */

const ADMIN_COOKIE_NAME = "next-auth.session-token.tutor-connect";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Read the JWT (if any). Errors during decode → null (treated as anon).
  let token: { role?: string } | null = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName: ADMIN_COOKIE_NAME,
    });
  } catch {
    token = null;
  }

  const isAdmin = token?.role === "ADMIN";

  // Case 1: admin user hitting the landing page → skip to admin app.
  if (pathname === "/" && isAdmin) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Case 2: non-admin (or anon) hitting /admin/* → admin sign-in.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (!isAdmin) {
      const url = request.nextUrl.clone();
      url.pathname = "/auth/admin-signin";
      url.search = "";
      // Preserve the original path (not search — avoids open-redirect risk
      // from reflecting arbitrary query strings) as the post-login target.
      url.searchParams.set("callbackUrl", pathname + search);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Only run the proxy for `/` and `/admin/*`. Everything else passes
  // through untouched — keeping the blast radius minimal.
  matcher: ["/", "/admin/:path*"],
};
