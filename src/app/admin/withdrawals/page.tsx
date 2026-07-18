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
    <div className="max-w-full">
      <h1 className="mb-2">Withdrawal Payouts Management</h1>
      <p className="text-muted mb-6">
        Review and process mobile financial service (MFS) payout requests submitted by tutors.
      </p>

      <WithdrawalManager initialRequests={requests} />
    </div>
  );
}
