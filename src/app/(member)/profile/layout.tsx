import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { getMemberSidebarCounts } from '@/lib/server/member-counts';

export default async function ProfileRootLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/profile',
  });

  // Sidebar Payments badge: count of requests awaiting payment (MATCHED).
  const currentCounts = await getMemberSidebarCounts((session.user as { id: string }).id);

  return (
    <DashboardLayout
      role={(session.user as { role: 'STUDENT' | 'TUTOR' }).role}
      userName={session.user?.name}
      userEmail={session.user?.email}
      currentCounts={currentCounts}
      isTutor={currentCounts.isTutor}
    >
      {children}
    </DashboardLayout>
  );
}
