import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import styles from '../dashboard.module.css';
import AdminSidebar from './AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/auth/admin-signin');
  }

  // Fetch counts in parallel
  const [requests, withdrawals, users, support, departments, courses, expertises, passwordResets] = await Promise.all([
    prisma.tutorRequest.count(),
    prisma.withdrawalRequest.count(),
    prisma.user.count(),
    prisma.supportTicket.count(),
    prisma.department.count(),
    prisma.course.count(),
    prisma.tutorExpertise.count(),
    prisma.passwordResetRequest.count({ where: { status: 'PENDING' } }),
  ]);

  const currentCounts = { requests, withdrawals, users, support, departments, courses, expertises, passwordResets };

  return (
    <div className={styles.dashboardContainer}>
      <AdminSidebar currentCounts={currentCounts} userName={session.user?.name} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
