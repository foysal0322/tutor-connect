import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  // Same unified-campus rule as the student layout.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'TUTOR', {
    // /tutor is a legacy route that redirects to the unified /dashboard, so
    // send signed-in users there rather than round-tripping through /tutor.
    redirectTo: '/auth/signin?callbackUrl=/dashboard',
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
