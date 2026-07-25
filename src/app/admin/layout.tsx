import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role !== 'ADMIN') {
    redirect('/auth/admin-signin');
  }

  // Fetch counts in parallel
  const [requests, withdrawals, users, support, departments, courses, expertises, passwordResets, consultancy] = await Promise.all([
    prisma.tutorRequest.count({ 
      where: { 
        OR: [
          { status: 'PENDING' },
          { status: 'PAYMENT_PENDING' },
          { refundRequests: { some: { status: 'PENDING' } } }
        ]
      }
    }),
    prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    prisma.user.count(),
    prisma.supportTicket.count({ where: { status: 'PENDING' } }),
    prisma.department.count(),
    prisma.course.count(),
    prisma.tutorExpertise.count(),
    prisma.passwordResetRequest.count({ where: { status: 'PENDING' } }),
    prisma.consultancyRequest.count({ where: { status: 'PENDING' } }),
  ]);

  const currentCounts = { requests, withdrawals, users, support, departments, courses, expertises, passwordResets, consultancy };

  return (
    <DashboardLayout 
      role="ADMIN" 
      userName={session.user?.name}
      userEmail={session.user?.email}
      currentCounts={currentCounts}
    >
      {children}
    </DashboardLayout>
  );
}
