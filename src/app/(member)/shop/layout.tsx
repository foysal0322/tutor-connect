import AdaptiveShell from '@/components/layout/AdaptiveShell';

/**
 * Shop layout — applies AdaptiveShell so authed members get the dashboard
 * shell (sidebar + topbar) while guests get the marketing Navbar + Footer.
 *
 * All shop routes live under (member)/shop/ — the same route group as
 * wallet / consultancy / find-tutor. This avoids double chrome: had shop
 * stayed in (marketing)/, signed-in members would have inherited both the
 * marketing Navbar (from (marketing)/layout.tsx) AND the DashboardLayout
 * from AdaptiveShell, producing duplicate navigation. URLs are unaffected
 * (`/shop`, `/shop/listing/[id]`, `/shop/selling`, …).
 */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdaptiveShell>{children}</AdaptiveShell>;
}
