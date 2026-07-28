import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function ProfileRootLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/profile',
  });

  return (
    <DashboardLayout role={(session.user as { role: 'STUDENT' | 'TUTOR' }).role}>
      {children}
    </DashboardLayout>
  );
}
