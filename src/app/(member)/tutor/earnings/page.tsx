import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EarningsClient from './EarningsClient';

export const revalidate = 0; // Dynamic on every request

export default async function TutorEarningsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role === 'ADMIN') {
    redirect('/auth/signin?callbackUrl=/tutor/earnings');
  }

  const tutorId = (session.user as any).id;

  // Wallet balance is the single source of truth for withdrawable funds
  // (earnings credit on session completion, debited on withdrawal submit).
  // totalEarned / totalWithdrawn below are display-only historical metrics.
  const [completedRequests, withdrawalRequests, tutorRow] = await Promise.all([
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: tutorId, status: 'COMPLETED' },
      include: { course: true, student: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.withdrawalRequest.findMany({
      where: { tutorId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.findUnique({
      where: { id: tutorId },
      select: { balance: true },
    }),
  ]);

  const totalEarned = completedRequests.reduce((sum, r) => sum + r.budget, 0);
  const totalWithdrawn = withdrawalRequests
    .filter(w => w.status === 'APPROVED' || w.status === 'PENDING')
    .reduce((sum, w) => sum + w.amount, 0);
  const availableBalance = tutorRow?.balance ?? 0;

  return (
    <div className="max-w-full">
      <h1 className="mb-2">Earnings & Withdrawals</h1>
      <p className="text-muted mb-6">
        View completed tuition revenues, track balance eligibility, and request withdrawals.
      </p>

      <EarningsClient
        completedRequests={completedRequests}
        withdrawalRequests={withdrawalRequests}
        totalEarned={totalEarned}
        totalWithdrawn={totalWithdrawn}
        availableBalance={availableBalance}
      />
    </div>
  );
}
