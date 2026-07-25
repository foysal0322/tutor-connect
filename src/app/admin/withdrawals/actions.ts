'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { sendNoReplyEmail } from '@/lib/mail';

export async function verifyWithdrawalRequest(withdrawId: string, approve: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  try {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawId },
      include: { tutor: true }
    });

    if (!request) {
      return { error: 'Withdrawal request not found.' };
    }

    if (request.status !== 'PENDING') {
      return { error: 'This request has already been processed.' };
    }

    await prisma.withdrawalRequest.update({
      where: { id: withdrawId },
      data: {
        status: approve ? 'APPROVED' : 'REJECTED'
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

    revalidatePath('/admin/withdrawals');
    return { success: true };
  } catch (err) {
    console.error('Verify withdrawal request error:', err);
    return { error: 'Failed to process withdrawal request.' };
  }
}

