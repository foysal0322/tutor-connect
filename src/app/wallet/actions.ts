'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function rechargeWallet(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return { error: 'Not authorized. Please sign in.' };
  }

  const userId = (session.user as any).id;
  const amountStr = formData.get('amount') as string;
  const mfsType = formData.get('mfsType') as string;
  const accountNumber = formData.get('accountNumber') as string || 'N/A';
  const transactionId = formData.get('transactionId') as string || `TXN-${Date.now()}`;

  const amount = parseFloat(amountStr);
  if (isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid positive recharge amount.' };
  }

  if (amount < 50) {
    return { error: 'Minimum recharge amount is 50 BDT.' };
  }

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
