import { requireRole } from '@/lib/server/auth-gate';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { prisma } from '@/lib/prisma';

export default async function DashboardRootLayout({ children }: { children: React.ReactNode }) {
  // Unified member dashboard — both STUDENT and TUTOR roles are welcome.
  // Sidebar.getLinks already renders the same Learning+Teaching nav for both.
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/dashboard',
  });

  // Count requests awaiting payment (MATCHED) so the sidebar shows a red badge
  // on the Payments link. Visible across dashboard pages until the payment is done.
  const paymentsDue = await prisma.tutorRequest.count({
    where: {
      studentId: (session.user as { id: string }).id,
      status: 'MATCHED',
    },
  });

  return (
    <DashboardLayout
      role={(session.user as { role: 'STUDENT' | 'TUTOR' }).role}
      currentCounts={{ paymentsDue }}
    >
      {children}
    </DashboardLayout>
  );
}
