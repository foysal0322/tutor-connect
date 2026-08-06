'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendNoReplyEmail } from '@/lib/mail';
import { idSchema } from '@/lib/validation';
import { dispatch } from '@/lib/notifications/service';

export async function verifyWithdrawalRequest(withdrawId: string, approve: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  // Validate the id argument (this action takes a string param, not FormData).
  const idResult = idSchema.safeParse(withdrawId);
  if (!idResult.success) {
    return { error: 'Invalid withdrawal request id.' };
  }
  const safeId = idResult.data;

  try {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: safeId },
      include: { tutor: true }
    });

    if (!request) {
      return { error: 'Withdrawal request not found.' };
    }

    if (request.status !== 'PENDING') {
      return { error: 'This request has already been processed.' };
    }

    // Under the unified-wallet model, the wallet was already debited at
    // submission time. APPROVE = no balance change (the money is already
    // reserved). REJECT = credit the gross amount back to the tutor's
    // wallet, atomically with the status flip.
    await prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: { id: safeId },
        data: { status: approve ? 'APPROVED' : 'REJECTED' },
      });

      if (!approve) {
        await tx.user.update({
          where: { id: request.tutorId },
          data: { balance: { increment: request.amount } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: request.tutorId,
            amount: request.amount,
            type: 'WITHDRAWAL',
            referenceId: request.id,
            description: 'Withdrawal rejected — refund to wallet',
          },
        });
      }
    });

    try {
      const statusText = approve ? 'APPROVED' : 'REJECTED';
      await sendNoReplyEmail({
        to: request.tutor.email,
        subject: `Withdrawal Request ${statusText} - NSUone`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: ${approve ? '#10b981' : '#ef4444'};">Withdrawal ${statusText}</h2>
            <p>Hello ${request.tutor.name},</p>
            <p>Your withdrawal request for <strong>${request.netAmount} BDT</strong> via ${request.mfsType} (${request.accountNumber}) has been <strong>${statusText}</strong>.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.error('Failed to send withdrawal status email:', mailErr);
    }

    // Phase 6: in-app + push notification to the tutor (additive — the email
    // above is unchanged). Previously tutors only received an email; this
    // gives them a Notification row + web push so the bell surfaces it.
    try {
      await dispatch({
        event: approve ? 'withdrawal.approved' : 'withdrawal.rejected',
        userId: request.tutorId,
        title: `Withdrawal ${approve ? 'Approved' : 'Rejected'}`,
        message: approve
          ? `Your withdrawal of ${request.netAmount} BDT has been approved and is being processed.`
          : `Your withdrawal of ${request.netAmount} BDT was rejected. Contact support if you have questions.`,
        actionUrl: '/tutor/earnings',
        type: approve ? 'SUCCESS' : 'REJECTION',
        category: 'WITHDRAWAL',
        priority: approve ? 'HIGH' : 'HIGH',
        actorUserId: (session.user as any).id,
        recipientRoleHint: 'TUTOR',
        metadata: {
          withdrawalId: request.id,
          amount: request.amount,
          netAmount: request.netAmount,
          method: request.method,
          mfsType: request.mfsType,
          accountNumber: request.accountNumber,
        },
      });
    } catch (err) {
      console.error('Failed to notify tutor of withdrawal status:', err);
    }

    revalidatePath('/admin/withdrawals');
    return { success: true };
  } catch (err) {
    console.error('Verify withdrawal request error:', err);
    return { error: 'Failed to process withdrawal request.' };
  }
}

