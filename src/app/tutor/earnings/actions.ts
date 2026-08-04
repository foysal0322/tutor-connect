'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyWithdrawRequest } from '@/lib/discord';
import { parseFormData, submitWithdrawalSchema } from '@/lib/validation';
import { getPlatformSettings } from '@/lib/cache';

export async function submitWithdrawalRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') {
    return { error: 'Not authorized.' };
  }

  const tutorId = (session.user as any).id;

  // Server-authoritative input validation (replaces hand-rolled parseFloat).
  const parsed = parseFormData(formData, submitWithdrawalSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const { amount, method } = parsed.data;

  // Validate destination fields per method (cross-field rules).
  let mfsType: string | null = null;
  let accountNumber: string | null = null;
  let transferType: string | null = null;
  let accountHolderName: string | null = null;
  let bankName: string | null = null;
  let bankAccountNumber: string | null = null;
  let branch: string | null = null;
  let bftn: string | null = null;

  if (method === 'BANK') {
    accountHolderName = parsed.data.accountHolderName?.trim() || null;
    bankName = parsed.data.bankName?.trim() || null;
    bankAccountNumber = parsed.data.bankAccountNumber?.trim() || null;
    branch = parsed.data.branch?.trim() || null;
    bftn = parsed.data.bftn?.trim() || null;

    if (!accountHolderName || !bankName || !bankAccountNumber || !branch || !bftn) {
      return { error: 'All bank fields are required.' };
    }
    if (!/^\d{9}$/.test(bftn)) {
      return { error: 'BFTN must be exactly 9 digits.' };
    }
  } else {
    mfsType = parsed.data.mfsType || null;
    accountNumber = parsed.data.accountNumber?.trim() || null;
    transferType = parsed.data.transferType || 'SEND_MONEY';

    if (!mfsType || !accountNumber || !transferType) {
      return { error: 'All MFS fields are required.' };
    }
  }

  try {
    // Compute available balance AND insert the withdrawal request inside one
    // transaction so concurrent submissions can't both pass the balance check
    // and over-draw. The array-form $transaction is serialised by Postgres
    // against other write transactions on the same rows.
    //
    // NOTE: we recompute earnings/withdrawn at submission time rather than
    // caching on the user — this is the source of truth, not the form.
    const result = await prisma.$transaction(async (tx) => {
      // 1. Completed earnings (gross, before any platform fee).
      const completedRequests = await tx.tutorRequest.findMany({
        where: { assignedTutorId: tutorId, status: 'COMPLETED' },
        select: { budget: true },
      });
      const totalEarned = completedRequests.reduce((sum, r) => sum + r.budget, 0);

      // 2. Total already claimed by PENDING or APPROVED withdrawals.
      // (REJECTED rows are excluded — that money is available again.)
      const withdrawalRequests = await tx.withdrawalRequest.findMany({
        where: { tutorId, status: { in: ['PENDING', 'APPROVED'] } },
        select: { amount: true },
      });
      const totalWithdrawn = withdrawalRequests.reduce((sum, w) => sum + w.amount, 0);

      const availableBalance = totalEarned - totalWithdrawn;

      if (amount > availableBalance) {
        throw new Error(
          `INSUFFICIENT:${availableBalance}`,
        );
      }

      // 3. Platform fee — configurable via /admin/settings. The withdrawal
      // action reads the cached config inside the transaction so a settings
      // change applies to withdrawals submitted after the cache TTL (60s).
      // Keep this calc server-side, never trust the client.
      const settings = await getPlatformSettings();
      const platformFee = amount * (settings.withdrawalFeePercent / 100);
      const netAmount = amount - platformFee;

      return tx.withdrawalRequest.create({
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
          status: 'PENDING',
        },
      });
    });

    try {
      const tutorName = session.user?.name || 'A tutor';
      await notifyWithdrawRequest({
        tutorName,
        amount,
        method: method === 'BANK' ? `Bank (${bankName})` : (mfsType || 'MFS'),
      });
    } catch (err) {
      console.error('Failed to send discord withdraw notification', err);
    }

    revalidatePath('/tutor/earnings');
    return { success: true, withdrawalId: result.id };
  } catch (err) {
    // Distinguish the typed insufficient-balance error from real failures.
    if (err instanceof Error && err.message.startsWith('INSUFFICIENT:')) {
      const available = err.message.split(':')[1];
      return { error: `Insufficient balance. Your available balance is ${available} BDT.` };
    }
    console.error('Withdrawal request error:', err);
    return { error: 'Failed to submit withdrawal request.' };
  }
}
