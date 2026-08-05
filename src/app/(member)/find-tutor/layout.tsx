import AdaptiveShell from '@/components/layout/AdaptiveShell';

/**
 * Find-a-Tutor adaptive layout.
 *
 * Members arrive via the sidebar → they see the DashboardLayout shell
 * (Sidebar + Topbar). Public visitors arrive via the marketing Navbar
 * → they see Navbar + Footer. The AdaptiveShell handles the switch.
 */
export default async function FindTutorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdaptiveShell>{children}</AdaptiveShell>;
}
