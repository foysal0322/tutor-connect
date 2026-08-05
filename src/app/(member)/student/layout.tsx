import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getMemberSidebarCounts } from '@/lib/server/member-counts';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // nsuOne is a unified campus marketplace — both STUDENT and TUTOR can use
  // the student dashboard. Admins are bounced to their own sign-in.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    // /student is a legacy route that redirects to the unified /dashboard, so
    // send signed-in users there rather than round-tripping through /student.
    redirectTo: '/auth/signin?callbackUrl=/dashboard',
  });

  // Sidebar Payments badge: count of requests awaiting payment (MATCHED).
  const currentCounts = await getMemberSidebarCounts((session.user as { id: string }).id);

  return (
    <DashboardLayout
      role="STUDENT"
      userName={session.user?.name}
      userEmail={session.user?.email}
      currentCounts={currentCounts}
      isTutor={currentCounts.isTutor}
    >
      {children}
    </DashboardLayout>
  );
}
