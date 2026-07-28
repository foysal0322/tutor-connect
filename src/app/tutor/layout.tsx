import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  // Same unified-campus rule as the student layout.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'TUTOR', {
    redirectTo: '/auth/signin?callbackUrl=/tutor',
  });

  return (
    <DashboardLayout
      role="TUTOR"
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      {children}
    </DashboardLayout>
  );
}
