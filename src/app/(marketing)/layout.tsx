import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

/**
 * Marketing layout — applies the public chrome (Navbar + Footer) to every
 * route inside the `(marketing)` route group. URL-agnostic per Next.js
 * route-group semantics: pages keep their public paths (`/`, `/find-tutor`,
 * `/consultancy`, `/auth/*`, `/wallet`, `/profile`, …) but only these
 * routes get the marketing navbar and footer.
 *
 * Admin (`/admin/*`) and member dashboard (`/dashboard/*`) live outside
 * this group and therefore bypass the marketing chrome — they have their
 * own shells via `admin/layout.tsx` and `dashboard/layout.tsx`.
 *
 * Root layout (src/app/layout.tsx) keeps providers, skip-link, and the
 * `<main id='main'>` target; this layout wraps children inside that main.
 *
 * Phase 2 of ADMIN_DASHBOARD_REDESIGN_PLAN.md.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
