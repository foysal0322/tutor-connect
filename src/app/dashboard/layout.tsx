import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  // Unified member dashboard — both STUDENT and TUTOR roles are welcome.
  // Sidebar.getLinks already renders the same Learning+Teaching nav for both.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/dashboard',
  });

  return (
    <DashboardLayout role={(session.user as { role: 'STUDENT' | 'TUTOR' }).role}>
      {children}
    </DashboardLayout>
  );
}
