import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getMemberSidebarCounts } from '@/lib/server/member-counts';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  // Same unified-campus rule as the student layout.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'TUTOR', {
    // /tutor is a legacy route that redirects to the unified /dashboard, so
    // send signed-in users there rather than round-tripping through /tutor.
    redirectTo: '/auth/signin?callbackUrl=/dashboard',
  });

  // Sidebar Payments badge: count of requests awaiting payment (MATCHED).
  const currentCounts = await getMemberSidebarCounts((session.user as { id: string }).id);

  return (
    <DashboardLayout
      role="TUTOR"
      userName={session.user?.name}
      userEmail={session.user?.email}
      currentCounts={currentCounts}
    >
      {children}
    </DashboardLayout>
  );
}
