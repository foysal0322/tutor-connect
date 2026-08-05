import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMemberSidebarCounts } from '@/lib/server/member-counts';
import DashboardLayout from '@/components/layout/DashboardLayout';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

/**
 * AdaptiveShell — renders different chrome based on auth state.
 *
 * Used by pages that are linked from BOTH the member sidebar AND public
 * marketing navigation (e.g. /find-tutor, /consultancy). The shell
 * adapts so members never lose their sidebar/topbar context, while
 * public visitors still get the marketing Navbar + Footer.
 *
 * - Authenticated member (STUDENT/TUTOR) → <DashboardLayout> shell
 * - Guest or admin → marketing <Navbar/> + <Footer/>
 *
 * This is a server component — the session check runs per-request.
 */
export default async function AdaptiveShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; role?: string; name?: string | null; email?: string | null }
    | undefined;

  // Authenticated non-admin member → dashboard shell
  if (user?.id && (user.role === 'STUDENT' || user.role === 'TUTOR')) {
    const currentCounts = await getMemberSidebarCounts(user.id);
    return (
      <DashboardLayout
        role={user.role}
        userName={user.name ?? null}
        userEmail={user.email ?? null}
        currentCounts={currentCounts}
        isTutor={currentCounts.isTutor}
      >
        {children}
      </DashboardLayout>
    );
  }

  // Guest or admin → marketing chrome
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
