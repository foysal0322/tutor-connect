import AdaptiveShell from '@/components/layout/AdaptiveShell';

/**
 * Shop layout — applies AdaptiveShell so authed members get the dashboard
 * shell (sidebar + topbar) while guests get the marketing Navbar + Footer.
 *
 * All shop routes live under (marketing)/shop/ for URL cleanliness
 * (`/shop`, `/shop/listing/[id]`, `/shop/selling`, …) but the chrome
 * switches based on auth — see AdaptiveShell.
 */
export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdaptiveShell>{children}</AdaptiveShell>;
}
