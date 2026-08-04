import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getMemberSidebarCounts } from '@/lib/server/member-counts';

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  // Unified member dashboard — both STUDENT and TUTOR roles are welcome.
  // Sidebar.getLinks already renders the same Learning+Teaching nav for both.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/dashboard',
  });

  // Sidebar Payments badge: count of requests awaiting payment (MATCHED).
  const currentCounts = await getMemberSidebarCounts((session.user as { id: string }).id);

  return (
    <DashboardLayout
      role={(session.user as { role: 'STUDENT' | 'TUTOR' }).role}
      userName={session.user?.name ?? null}
      userEmail={session.user?.email ?? null}
      currentCounts={currentCounts}
    >
      {children}
    </DashboardLayout>
  );
}
