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
    await prisma.walletTransaction.create({
      data: {
        userId,
        amount,
        type: 'RECHARGE',
        description: `Wallet recharge via ${mfsType} (${accountNumber})`,
        referenceId: transactionId
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

  return {
    balance: user?.balance || 0,
    transactions
  };
}
