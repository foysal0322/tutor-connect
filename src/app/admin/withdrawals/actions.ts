'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function verifyWithdrawalRequest(withdrawId: string, approve: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  try {
    const request = await prisma.withdrawalRequest.findUnique({
      where: { id: withdrawId }
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

    revalidatePath('/admin/withdrawals');
    return { success: true };
  } catch (err) {
    console.error('Verify withdrawal request error:', err);
    return { error: 'Failed to process withdrawal request.' };
  }
}
