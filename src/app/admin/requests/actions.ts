'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification';

export async function assignTutorToRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  const requestId = formData.get('requestId') as string;
  const tutorId = formData.get('tutorId') as string;

  const request = await prisma.tutorRequest.findUnique({
    where: { id: requestId },
    select: { courseId: true, studentId: true, topic: true }
  });

  let newBudget = undefined;
  if (request) {
    const expertise = await prisma.tutorExpertise.findFirst({
      where: { tutorId, courseId: request.courseId }
    });
    if (expertise) {
      newBudget = expertise.sessionFee;
    }
  }

  await prisma.tutorRequest.update({
    where: { id: requestId },
    data: {
      assignedTutorId: tutorId,
      status: 'MATCHED',
      ...(newBudget !== undefined && { budget: newBudget })
    }
  });

  if (request && newBudget !== undefined) {
    // Send push notification to student
    try {
      await createNotification(
        request.studentId,
        "Tutor Assigned!",
        `A tutor has been assigned for your request (${request.topic}). The final fee is ${newBudget} BDT.`,
        `/student`
      );
    } catch (err) {
      console.error("Failed to notify student:", err);
    }
  }

  revalidatePath('/admin/requests');
}

export async function verifyPaymentAction(requestId: string, approve: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  try {
    if (approve) {
      await prisma.tutorRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      });
    } else {
      // Rejection: delete the payment record and set request status back to MATCHED
      await prisma.payment.delete({
        where: { requestId }
      });

      await prisma.tutorRequest.update({
        where: { id: requestId },
        data: { status: 'MATCHED' }
      });
    }

    revalidatePath('/admin/requests');
    return { success: true };
  } catch (err) {
    console.error('Verify payment error:', err);
    return { error: 'Failed to verify payment.' };
  }
}

export async function verifyRefundAction(refundRequestId: string, approve: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  try {
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId }
    });

    if (!refundRequest) {
      return { error: 'Refund request not found.' };
    }

    if (approve) {
      await prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: { status: 'APPROVED' }
      });

      await prisma.tutorRequest.update({
        where: { id: refundRequest.requestId },
        data: { status: 'CANCELLED' } // or keep a custom status like 'REFUNDED', cancelled fits best based on schema
      });
    } else {
      await prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: { status: 'REJECTED' }
      });
    }

    revalidatePath('/admin/requests');
    return { success: true };
  } catch (err) {
    console.error('Verify refund error:', err);
    return { error: 'Failed to verify refund.' };
  }
}
