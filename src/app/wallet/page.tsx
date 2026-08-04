import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getWalletData } from './actions';
import WalletClient from './WalletClient';
import WalletHub from './WalletHub';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PaymentsView from '@/app/student/payments/PaymentsView';
import EarningsClient from '@/app/tutor/earnings/EarningsClient';

export const revalidate = 0; // Dynamic on every request.

/**
 * Unified Money hub. Combines the campus wallet, student payments, and tutor
 * earnings & withdrawals into a single page with three tabs. Replaces the
 * three separate sidebar items (Policy #35).
 */
export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/auth/signin?callbackUrl=/wallet');
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role || 'STUDENT';

  // Fetch all three datasets in parallel. Each is independent.
  const [walletData, paymentRequests, pendingRequests, completedRequests, withdrawalRequests] =
    await Promise.all([
      getWalletData(),
      prisma.tutorRequest.findMany({
        where: { studentId: userId, payment: { isNot: null } },
        include: { course: true, payment: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tutorRequest.findMany({
        where: { studentId: userId, status: 'MATCHED' },
        include: {
          course: true,
          assignedTutor: { include: { department: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.tutorRequest.findMany({
        where: { assignedTutorId: userId, status: 'COMPLETED' },
        include: { course: true, student: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.withdrawalRequest.findMany({
        where: { tutorId: userId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

  if ('error' in walletData || !walletData) {
    redirect('/auth/force-signout?reason=session-expired');
  }

  // Derived summary figures.
  const paymentsDueTotal = pendingRequests.reduce((sum, r) => sum + r.budget * 1.05, 0);
  const totalEarned = completedRequests.reduce((sum, r) => sum + r.budget, 0);
  const totalWithdrawn = withdrawalRequests
    .filter((w) => w.status === 'APPROVED' || w.status === 'PENDING')
    .reduce((sum, w) => sum + w.amount, 0);
  const earningsAvailable = totalEarned - totalWithdrawn;

  // Each panel is pre-rendered server-side and handed to the client hub as a
  // React node. The hub's Tabs switch between them without re-fetching.
  const walletPanel = (
    <WalletClient
      initialBalance={walletData.balance || 0}
      initialTransactions={walletData.transactions || []}
      totalDeposited={walletData.totalDeposited || 0}
      totalSpent={walletData.totalSpent || 0}
      recentWithdrawals={walletData.recentWithdrawals || []}
      userName={session.user?.name || 'Student'}
    />
  );

  const paymentsPanel = (
    <PaymentsView
      requests={paymentRequests}
      pendingRequests={pendingRequests}
      userBalance={walletData.balance || 0}
    />
  );

  const earningsPanel = (
    <EarningsClient
      completedRequests={completedRequests}
      withdrawalRequests={withdrawalRequests}
      totalEarned={totalEarned}
      totalWithdrawn={totalWithdrawn}
      availableBalance={earningsAvailable}
    />
  );

  return (
    <DashboardLayout
      role={role as any}
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      <WalletHub
        userName={session.user?.name || undefined}
        walletBalance={walletData.balance || 0}
        paymentsDueCount={pendingRequests.length}
        paymentsDueTotal={paymentsDueTotal}
        earningsAvailable={earningsAvailable}
        walletPanel={walletPanel}
        paymentsPanel={paymentsPanel}
        earningsPanel={earningsPanel}
      />
    </DashboardLayout>
  );
}
