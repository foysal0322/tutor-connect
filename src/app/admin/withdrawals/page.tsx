import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import WithdrawalManager from './WithdrawalManager';

export const revalidate = 0; // Dynamic on every request

export default async function AdminWithdrawalsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/auth/admin-signin?callbackUrl=/admin/withdrawals');
  }

  const requests = await prisma.withdrawalRequest.findMany({
    include: {
      tutor: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '0.25rem' }}>Withdrawal Payouts Management</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Review and process mobile financial service (MFS) payout requests submitted by tutors.
      </p>

      <WithdrawalManager initialRequests={requests} />
    </div>
  );
}
