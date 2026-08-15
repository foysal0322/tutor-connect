import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import WalletManager from './WalletManager';

export const revalidate = 0; // Dynamic on every request — balances change often.

export default async function AdminWalletsPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'ADMIN') {
    redirect('/auth/admin-signin?callbackUrl=/admin/wallets');
  }

  const { userId: focusUserId } = await searchParams;

  // Member-submitted deposits awaiting TrxID verification. Approval (in
  // reviewDeposit) is what credits the balance.
  const pendingDepositRows = await prisma.walletTransaction.findMany({
    where: { type: 'RECHARGE', status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: 50,
    select: {
      id: true,
      amount: true,
      description: true,
      referenceId: true,
      createdAt: true,
      user: { select: { name: true, nsuId: true } },
    },
  });

  const pendingDeposits = pendingDepositRows.map((d) => ({
    id: d.id,
    amount: d.amount,
    description: d.description,
    trxId: d.referenceId,
    createdAt: d.createdAt.toISOString(),
    userName: d.user.name,
    userNsuId: d.user.nsuId,
  }));

  // Members only — admin wallets are intentionally not adjustable from here.
  const users = await prisma.user.findMany({
    where: { role: { in: ['STUDENT', 'TUTOR'] } },
    select: {
      id: true,
      name: true,
      nsuId: true,
      email: true,
      role: true,
      balance: true,
      department: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Recent admin adjustments — audit feed. Resolves the admin who actioned
  // each row via the referenceId (we store the admin's userId there).
  const recentAdjustments = await prisma.walletTransaction.findMany({
    where: { type: 'ADMIN_ADJUSTMENT' },
    orderBy: { createdAt: 'desc' },
    take: 20,
    select: {
      id: true,
      userId: true,
      amount: true,
      description: true,
      referenceId: true,
      createdAt: true,
      user: { select: { name: true, nsuId: true } },
    },
  });

  // Resolve admin names for the audit feed (single query, then map).
  const adminIds = Array.from(
    new Set(recentAdjustments.map((a) => a.referenceId).filter(Boolean)),
  ) as string[];
  const admins = adminIds.length
    ? await prisma.user.findMany({
        where: { id: { in: adminIds } },
        select: { id: true, name: true },
      })
    : [];
  const adminNameById = new Map(admins.map((a) => [a.id, a.name]));

  const adjustments = recentAdjustments.map((a) => ({
    id: a.id,
    amount: a.amount,
    description: a.description,
    createdAt: a.createdAt.toISOString(),
    userName: a.user.name,
    userNsuId: a.user.nsuId,
    adminName: a.referenceId ? adminNameById.get(a.referenceId) ?? 'Admin' : 'Admin',
  }));

  return (
    <div className='max-w-full'>
      <WalletManager
        users={users}
        adjustments={adjustments}
        pendingDeposits={pendingDeposits}
        focusUserId={focusUserId}
      />
    </div>
  );
}
