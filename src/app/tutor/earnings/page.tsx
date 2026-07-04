import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import EarningsClient from './EarningsClient';

export const revalidate = 0; // Dynamic on every request

export default async function TutorEarningsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'TUTOR') {
    redirect('/auth/tutor-signin?callbackUrl=/tutor/earnings');
  }

  const tutorId = (session.user as any).id;

  // 1. Fetch all completed tutor requests for this tutor
  const completedRequests = await prisma.tutorRequest.findMany({
    where: {
      assignedTutorId: tutorId,
      status: 'COMPLETED'
    },
    include: {
      course: true,
      student: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  const totalEarned = completedRequests.reduce((sum, r) => sum + r.budget, 0);

  // 2. Fetch withdrawal requests
  const withdrawalRequests = await prisma.withdrawalRequest.findMany({
    where: {
      tutorId
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Total withdrawn is the sum of withdrawals that are APPROVED or PENDING
  const totalWithdrawn = withdrawalRequests
    .filter(w => w.status === 'APPROVED' || w.status === 'PENDING')
    .reduce((sum, w) => sum + w.amount, 0);

  const availableBalance = totalEarned - totalWithdrawn;

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '0.25rem' }}>Earnings & Withdrawals</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
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
