'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { parseFormData, rechargeWalletSchema } from '@/lib/validation';

export async function rechargeWallet(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { error: 'Not authorized. Please sign in.' };
  }

  const parsed = parseFormData(formData, rechargeWalletSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const { amount, mfsType, accountNumber, transactionId } = parsed.data;

  const userId = (session.user as any).id;

  try {
    // Increment user balance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount
        }
      }
    });

    // Create wallet transaction record
    const isDemo = mfsType === 'DEMO';
    await prisma.walletTransaction.create({
      data: {
        userId,
        amount,
        type: 'RECHARGE',
        description: isDemo
          ? 'Wallet recharge (Demo — instant test credit)'
          : `Wallet recharge via ${mfsType} (${accountNumber})`,
        referenceId: transactionId || null
      }
    });

    revalidatePath('/wallet');
    revalidatePath('/student');
    revalidatePath('/tutor');
    return { success: true, newBalance: updatedUser.balance };
  } catch (err) {
    console.error('Wallet recharge error:', err);
    return { error: 'Failed to recharge wallet. Please try again later.' };
  }
}

export async function getWalletData() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { error: 'Not authorized' };
  }

  const userId = (session.user as any).id;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true }
  });

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Derive financial KPIs from the existing WalletTransaction rows.
  // Only RECHARGE (+) and TUITION_PAYMENT (−) types are written today, so we
  // aggregate those. Earning/withdrawal totals are intentionally NOT computed
  // here — they live on /tutor/earnings (sourced from TutorRequest +
  // WithdrawalRequest) and duplicating them would mislead students and
  // diverge from the earnings page's own calc.
  let totalDeposited = 0;
  let totalSpent = 0;
  for (const t of transactions) {
    if (t.type === 'RECHARGE') totalDeposited += t.amount;
    else if (t.type === 'TUITION_PAYMENT') totalSpent += Math.abs(t.amount);
  }

  // Surface the member's recent withdrawal requests so tutors can see
  // processing status without leaving the wallet. Empty for non-tutors.
  const recentWithdrawals = await prisma.withdrawalRequest.findMany({
    where: { tutorId: userId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      id: true,
      amount: true,
      platformFee: true,
      netAmount: true,
      mfsType: true,
      accountNumber: true,
      transferType: true,
      status: true,
      createdAt: true,
    },
  });

  return {
    balance: user?.balance || 0,
    transactions,
    totalDeposited,
    totalSpent,
    recentWithdrawals,
  };
}
