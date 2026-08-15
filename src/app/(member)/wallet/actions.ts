'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { parseFormData, rechargeWalletSchema } from '@/lib/validation';

/**
 * State shape returned by the deposit form's server action (used with
 * useActionState in WalletClient). `timestamp` is a nonce so the client can
 * distinguish a new success from a re-render of the previous one.
 */
export interface RechargeWalletState {
  error?: string;
  success?: boolean;
  amount?: number;
  mfsType?: string;
  transactionId?: string | null;
  timestamp?: number;
}

export async function rechargeWallet(
  _prev: RechargeWalletState | null,
  formData: FormData,
): Promise<RechargeWalletState> {
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

  // The session is a JWT that may outlive the DB row (e.g. after a DB reset
  // or account deletion). Writes would throw P2025 ("Record to update not
  // found"), so verify the user exists and tell them to sign in again.
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) {
    return { error: 'Your account could not be found. Please sign out and sign in again.' };
  }

  try {
    // Deposits are NOT credited here. We record a PENDING transaction and an
    // admin verifies the MFS TrxID; only approval credits the balance. This
    // prevents fake TrxIDs from minting wallet money instantly.
    await prisma.walletTransaction.create({
      data: {
        userId,
        amount,
        type: 'RECHARGE',
        description: `Wallet recharge via ${mfsType} (${accountNumber})`,
        referenceId: transactionId || null,
        status: 'PENDING',
      }
    });

    revalidatePath('/wallet');
    revalidatePath('/admin/wallets');
    return {
      success: true,
      amount,
      mfsType,
      transactionId: transactionId || null,
      timestamp: Date.now(),
    };
  } catch (err) {
    console.error('Wallet recharge error:', err);
    return { error: 'Failed to submit deposit request. Please try again later.' };
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

  // Ghost session: the JWT references a user that no longer exists (DB reset,
  // account deletion). The wallet page redirects to force-signout on error,
  // which clears the stale cookie.
  if (!user) {
    return { error: 'Account not found' };
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  // Derive financial KPIs from the existing WalletTransaction rows.
  // Only RECHARGE (+) and TUITION_PAYMENT (−) types are written today, so we
  // aggregate those. Deposits only count once APPROVED (legacy rows default
  // to COMPLETED); PENDING/REJECTED requests never touched the balance.
  // Earning/withdrawal totals are intentionally NOT computed here — they
  // live on /tutor/earnings (sourced from TutorRequest + WithdrawalRequest)
  // and duplicating them would mislead students and diverge from the
  // earnings page's own calc.
  let totalDeposited = 0;
  let totalSpent = 0;
  for (const t of transactions) {
    if (t.type === 'RECHARGE' && t.status !== 'PENDING' && t.status !== 'REJECTED') {
      totalDeposited += t.amount;
    } else if (t.type === 'TUITION_PAYMENT') {
      totalSpent += Math.abs(t.amount);
    }
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
