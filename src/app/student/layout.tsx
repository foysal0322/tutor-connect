import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  // nsuOne is a unified campus marketplace — both STUDENT and TUTOR can use
  // the student dashboard. Admins are bounced to their own sign-in.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/student',
  });

  return (
    <DashboardLayout
      role="STUDENT"
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      {children}
    </DashboardLayout>
  );
}
