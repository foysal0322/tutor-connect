'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyWithdrawRequest } from '@/lib/discord';

export async function submitWithdrawalRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') {
    return { error: 'Not authorized.' };
  }

  const tutorId = (session.user as any).id;
  const amount = parseFloat(formData.get('amount') as string);
  const mfsType = formData.get('mfsType') as string;
  const accountNumber = formData.get('accountNumber') as string;
  const transferType = formData.get('transferType') as string;

  if (isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount.' };
  }

  if (!mfsType || !accountNumber || !transferType) {
    return { error: 'All fields are required.' };
  }

  try {
    // 1. Calculate tutor's completed earnings
    const completedRequests = await prisma.tutorRequest.findMany({
      where: {
        assignedTutorId: tutorId,
        status: 'COMPLETED'
      },
      select: {
        budget: true
      }
    });
    const totalEarned = completedRequests.reduce((sum, r) => sum + r.budget, 0);

    // 2. Calculate tutor's total withdrawn (requests that are approved or pending)
    const withdrawalRequests = await prisma.withdrawalRequest.findMany({
      where: {
        tutorId,
        status: { in: ['PENDING', 'APPROVED'] }
      },
      select: {
        amount: true
      }
    });
    const totalWithdrawn = withdrawalRequests.reduce((sum, w) => sum + w.amount, 0);

    const availableBalance = totalEarned - totalWithdrawn;

    if (amount > availableBalance) {
      return { error: `Insufficient balance. Your available balance is ${availableBalance} BDT.` };
    }

    // Calculate fees (5% commission after 50% discount on standard 10% platform fee)
    const platformFee = amount * 0.05;
    const netAmount = amount * 0.95;

    await prisma.withdrawalRequest.create({
      data: {
        tutorId,
        amount,
        platformFee,
        netAmount,
        mfsType,
        accountNumber,
        transferType,
        status: 'PENDING'
      }
    });

    try {
      const tutorName = session.user?.name || 'A tutor';
      await notifyWithdrawRequest({
        tutorName,
        amount,
        method: mfsType
      });
    } catch (err) {
      console.error('Failed to send discord withdraw notification', err);
    }

    revalidatePath('/tutor/earnings');
    return { success: true };
  } catch (err) {
    console.error('Withdrawal request error:', err);
    return { error: 'Failed to submit withdrawal request.' };
  }
}
