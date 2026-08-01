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
  const method = (formData.get('method') as string) || 'MFS';

  if (isNaN(amount) || amount <= 0) {
    return { error: 'Please enter a valid amount.' };
  }

  // Validate destination fields per method.
  let mfsType: string | null = null;
  let accountNumber: string | null = null;
  let transferType: string | null = null;
  let accountHolderName: string | null = null;
  let bankName: string | null = null;
  let bankAccountNumber: string | null = null;
  let branch: string | null = null;
  let bftn: string | null = null;

  if (method === 'BANK') {
    accountHolderName = (formData.get('accountHolderName') as string)?.trim() || null;
    bankName = (formData.get('bankName') as string)?.trim() || null;
    bankAccountNumber = (formData.get('bankAccountNumber') as string)?.trim() || null;
    branch = (formData.get('branch') as string)?.trim() || null;
    bftn = (formData.get('bftn') as string)?.trim() || null;

    if (!accountHolderName || !bankName || !bankAccountNumber || !branch || !bftn) {
      return { error: 'All bank fields are required.' };
    }
    if (!/^\d{9}$/.test(bftn)) {
      return { error: 'BFTN must be exactly 9 digits.' };
    }
  } else {
    mfsType = (formData.get('mfsType') as string) || null;
    accountNumber = (formData.get('accountNumber') as string) || null;
    transferType = (formData.get('transferType') as string) || 'SEND_MONEY';

    if (!mfsType || !accountNumber || !transferType) {
      return { error: 'All MFS fields are required.' };
    }
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
        method,
        mfsType,
        accountNumber,
        transferType,
        accountHolderName,
        bankName,
        bankAccountNumber,
        branch,
        bftn,
        status: 'PENDING'
      }
    });

    try {
      const tutorName = session.user?.name || 'A tutor';
      await notifyWithdrawRequest({
        tutorName,
        amount,
        method: method === 'BANK' ? `Bank (${bankName})` : (mfsType || 'MFS')
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
