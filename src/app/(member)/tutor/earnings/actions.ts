'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyWithdrawRequest } from '@/lib/discord';
import { notifyAdmins } from '@/lib/notifications/admin';
import { parseFormData, submitWithdrawalSchema } from '@/lib/validation';
import { getPlatformSettings } from '@/lib/cache';
import { redeemCoupon } from '@/lib/coupon';

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

  // Optional coupon code (COMMISSION scope). Validated + redeemed inside
  // the transaction below; ignored entirely if blank.
  const couponCode = ((formData.get('couponCode') as string) || '').trim();

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
      return { error: 'All bKash / Nagad / Rocket fields are required.' };
    }
  }

  try {
    // Available balance = User.balance (the single source of truth). We
    // re-read it inside the transaction so two concurrent submissions can't
    // both pass the check and over-draw. The amount is debited immediately
    // — the money is "reserved" until the admin approves or rejects. On
    // rejection the admin action credits it back.
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: tutorId },
        select: { balance: true },
      });
      const availableBalance = user?.balance ?? 0;

      if (amount > availableBalance) {
        throw new Error(
          `INSUFFICIENT:${availableBalance}`,
        );
      }

      // Platform fee — configurable via /admin/settings. The withdrawal
      // action reads the cached config inside the transaction so a settings
      // change applies to withdrawals submitted after the cache TTL (60s).
      // Keep this calc server-side, never trust the client.
      const settings = await getPlatformSettings();
      let platformFee = amount * (settings.withdrawalFeePercent / 100);

      // Optional COMMISSION coupon. Redeems atomically inside this
      // transaction and reduces the platform fee (floored at 0).
      let couponDiscount = 0;
      if (couponCode) {
        couponDiscount = await redeemCoupon(tx, {
          code: couponCode,
          scope: 'COMMISSION',
          amount: platformFee, // discount is computed against the fee, not gross
          userId: tutorId,
        });
        platformFee = Math.max(0, platformFee - couponDiscount);
      }
      const netAmount = amount - platformFee;

      const withdrawal = await tx.withdrawalRequest.create({
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

      // Debit the wallet now (reservation). On REJECT the admin action
      // credits this back; on APPROVE nothing else happens here.
      await tx.user.update({
        where: { id: tutorId },
        data: { balance: { decrement: amount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: tutorId,
          amount: -amount,
          type: 'WITHDRAWAL',
          referenceId: withdrawal.id,
          description: `Withdrawal requested via ${method}${couponDiscount > 0 ? ` (coupon saved ${couponDiscount} BDT on fee)` : ''}`,
        },
      });

      // Stamp the redemption with the withdrawal id now that we have it,
      // so re-submitting the same withdrawal can't double-redeem.
      if (couponCode && couponDiscount > 0) {
        await tx.couponRedemption.updateMany({
          where: {
            coupon: { code: couponCode.toUpperCase() },
            userId: tutorId,
            reference: null,
          },
          data: { reference: withdrawal.id },
        });
      }

      return withdrawal;
    });

    try {
      const tutorName = session.user?.name || 'A tutor';
      await notifyWithdrawRequest({
        tutorName,
        amount,
        method: method === 'BANK' ? `Bank (${bankName})` : (mfsType || 'MFS'),
      });

      // Phase 5: in-app admin notification (additive — Discord ping above is unchanged).
      const methodLabel = method === 'BANK' ? `Bank (${bankName})` : (mfsType || 'MFS');
      await notifyAdmins({
        event: 'withdrawal.submitted',
        title: 'Withdrawal Request',
        message: `${tutorName} requested ${amount} BDT via ${methodLabel}.`,
        actionUrl: '/admin/withdrawals',
        type: 'ACTION_REQUIRED',
        category: 'WITHDRAWAL',
        priority: 'HIGH',
        actorUserId: tutorId,
        metadata: { withdrawalId: result.id, amount, method: methodLabel },
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
    // Coupon errors carry a user-facing message from redeemCoupon.
    if (err instanceof Error && err.message) {
      return { error: err.message };
    }
    console.error('Withdrawal request error:', err);
    return { error: 'Failed to submit withdrawal request.' };
  }
}
