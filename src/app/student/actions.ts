'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyNewCourseRequest, notifyPaymentSubmission, notifyRefundRequest } from '@/lib/discord';

export async function submitTutorRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    return { error: 'Not authorized.' };
  }

  const studentId = (session.user as any).id;
  const courseId = formData.get('courseId') as string;
  const topic = formData.get('topic') as string;
  const facultyName = formData.get('facultyName') as string;
  const preferredMode = formData.get('preferredMode') as string;
  const preferredDateTime = formData.get('preferredDateTime') as string;
  const budget = parseFloat(formData.get('budget') as string);
  const tutorId = formData.get('tutorId') as string || null;
  const status = tutorId ? 'MATCHED' : 'PENDING';

  if (!courseId || !topic || !preferredMode || isNaN(budget)) {
    return { error: 'Please fill in all required fields.' };
  }

  // Prevent duplicate requests for the same course
  const existing = await prisma.tutorRequest.findFirst({
    where: { studentId, courseId, status },
    select: { id: true }
  });

  if (existing) {
    return { error: `You already have a ${status.toLowerCase()} request for this course.` };
  }

  await prisma.tutorRequest.create({
    data: {
      studentId,
      courseId,
      topic: topic.trim(),
      facultyName: facultyName?.trim(),
      preferredMode,
      preferredDateTime: preferredDateTime?.trim() || null,
      budget,
      assignedTutorId: tutorId,
      status
    }
  });

  // Send discord notification (fire-and-forget — don't block response)
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { name: true }
    });
    if (course) {
      const studentName = session.user?.name || 'A student';
      await notifyNewCourseRequest({
        courseName: course.name,
        studentName,
        topic: topic || 'General Help',
        budget: budget,
      });
    }
  } catch (err) {
    console.error('Failed to send discord notification', err);
  }

  revalidatePath('/student');
  return { success: true };
}

export async function cancelTutorRequest(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    return { error: 'Not authorized.' };
  }

  const studentId = (session.user as any).id;

  try {
    const existing = await prisma.tutorRequest.findFirst({
      where: { id, studentId },
      select: {
        id: true,
        status: true,
        topic: true,
        course: { select: { name: true } }
      }
    });

    if (!existing) {
      return { error: 'Request not found.' };
    }
    
    if (existing.status !== 'PENDING') {
      return { error: 'Only pending requests can be cancelled.' };
    }

    await prisma.tutorRequest.update({
      where: { id },
      data: { status: 'CANCELLED' }
    });

    // Send discord notification (non-blocking)
    try {
      const webhookUrl = 'https://discord.com/api/webhooks/1351086319815888916/GkSxw4XAuJDCeshqZ95GBLYiwwgk7VCv3LFL7qDsPBIqXebwBshikJd8HcJm-9OT0H6B';
      const studentName = session.user?.name || 'A student';
      const message = {
        embeds: [{
          title: '❌ Tutor Request Cancelled',
          color: 15158332,
          fields: [
            { name: 'Student', value: studentName, inline: true },
            { name: 'Course', value: existing.course.name, inline: true },
            { name: 'Topic', value: existing.topic || 'General Help', inline: true }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });
    } catch (err) {
      console.error('Failed to send cancel discord notification', err);
    }

    revalidatePath('/student');
    return { success: true };
  } catch {
    return { error: 'Failed to cancel request.' };
  }
}

export async function submitPayment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  const studentId = (session.user as any).id;
  const requestId = formData.get('requestId') as string;
  const mfsType = formData.get('mfsType') as string || 'CAMPUS_WALLET';
  const accountNumber = formData.get('accountNumber') as string || 'WALLET';
  const amount = parseFloat(formData.get('amount') as string || '0');
  const transactionId = formData.get('transactionId') as string || `WLT-${Date.now()}`;
  const walletAmountStr = formData.get('walletAmount') as string;
  const walletAmount = walletAmountStr ? parseFloat(walletAmountStr) : 0;

  if (!requestId) {
    return { error: 'Request ID is required.' };
  }

  try {
    let totalPaid = amount;
    let finalMfsType = mfsType;
    let newStatus = 'PAYMENT_PENDING';

    // Handle Wallet deduction if applied
    if (walletAmount > 0) {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { balance: true }
      });
      if (!student || student.balance < walletAmount) {
        return { error: `Insufficient wallet balance. You have ${student?.balance || 0} BDT available.` };
      }

      await prisma.user.update({
        where: { id: studentId },
        data: { balance: { decrement: walletAmount } }
      });

      await prisma.walletTransaction.create({
        data: {
          userId: studentId,
          amount: -walletAmount,
          type: 'TUITION_PAYMENT',
          description: `Tuition fee payment for request #${requestId.slice(-6)}`,
          referenceId: requestId
        }
      });

      totalPaid = amount + walletAmount;
      if (amount <= 0 || mfsType === 'CAMPUS_WALLET') {
        finalMfsType = 'CAMPUS_WALLET';
        newStatus = 'ACCEPTED'; // 100% wallet payment is instantly auto-verified
      } else {
        finalMfsType = `${mfsType} + WALLET`;
      }
    }

    const sanitizedAccountNumber = accountNumber.trim();
    const sanitizedTransactionId = transactionId.trim();

    await prisma.$transaction([
      prisma.payment.upsert({
        where: { requestId },
        update: {
          mfsType: finalMfsType,
          accountNumber: sanitizedAccountNumber,
          amount: totalPaid,
          transactionId: sanitizedTransactionId
        },
        create: {
          requestId,
          mfsType: finalMfsType,
          accountNumber: sanitizedAccountNumber,
          amount: totalPaid,
          transactionId: sanitizedTransactionId
        }
      }),
      prisma.tutorRequest.update({
        where: { id: requestId },
        data: { status: newStatus }
      }),
    ]);

    try {
      const studentName = session.user?.name || 'A student';
      await notifyPaymentSubmission({
        amount: totalPaid,
        method: finalMfsType,
        transactionId: sanitizedTransactionId,
        studentName,
      });
    } catch (err) {
      console.error('Failed to send payment discord notification', err);
    }

    revalidatePath('/student');
    revalidatePath('/wallet');
    return { success: true };
  } catch (err) {
    console.error('Submit payment error:', err);
    return { error: 'Failed to submit payment details.' };
  }
}

export async function completeTutorRequest(requestId: string, rating?: number | null, review?: string | null) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    return { error: 'Not authorized.' };
  }

  const studentId = (session.user as any).id;

  try {
    // Verify the request belongs to this student
    const request = await prisma.tutorRequest.findFirst({
      where: { id: requestId, studentId },
      select: { id: true, status: true }
    });

    if (!request) return { error: 'Request not found.' };
    if (request.status !== 'ACCEPTED') return { error: 'Only active sessions can be marked as completed.' };

    const updateData: any = { status: 'COMPLETED' };
    if (rating !== undefined && rating !== null) {
      updateData.rating = rating;
    }
    if (review !== undefined && review !== null) {
      updateData.review = review.trim();
    }

    await prisma.tutorRequest.update({
      where: { id: requestId },
      data: updateData
    });

    revalidatePath('/student');
    return { success: true };
  } catch (err) {
    console.error('Complete request error:', err);
    return { error: 'Failed to mark session as completed.' };
  }
}

export async function submitRefundRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    return { error: 'Not authorized.' };
  }

  const studentId = (session.user as any).id;
  const requestId = formData.get('requestId') as string;
  const details = formData.get('details') as string;

  if (!requestId || !details?.trim()) {
    return { error: 'Details/Reason is required.' };
  }

  try {
    // Check if there is already a refund request
    const existing = await prisma.refundRequest.findFirst({
      where: { requestId },
      select: { id: true }
    });

    if (existing) {
      return { error: 'A refund request has already been submitted for this session.' };
    }

    await prisma.refundRequest.create({
      data: {
        requestId,
        studentId,
        details: details.trim(),
        status: 'PENDING'
      }
    });

    // Send discord notification
    try {
      const studentName = session.user?.name || 'A student';
      await notifyRefundRequest({
        studentName,
        reason: details.trim(),
      });
    } catch (err) {
      console.error('Failed to send refund discord notification', err);
    }

    revalidatePath('/student');
    return { success: true };
  } catch (err) {
    console.error('Refund request error:', err);
    return { error: 'Failed to submit refund request.' };
  }
}
