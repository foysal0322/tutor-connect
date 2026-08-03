'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyNewCourseRequest, notifyPaymentSubmission, notifyRefundRequest } from '@/lib/discord';
import {
  parseFormData,
  submitTutorRequestSchema,
  submitPaymentSchema,
  submitRefundRequestSchema,
} from '@/lib/validation';

export async function submitTutorRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  // Unified dashboard: both STUDENT and TUTOR may use these actions; only
  // guests and ADMINs are blocked. Mirrors the /student layout + page gate
  // and the submitPayment action.
  if (!session || (session.user as any).role === 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  const parsed = parseFormData(formData, submitTutorRequestSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const { courseId, topic, facultyName, preferredMode, preferredDateTime, budget } = parsed.data;
  const tutorId = parsed.data.tutorId || null;

  const studentId = (session.user as any).id;
  const status = tutorId ? 'MATCHED' : 'PENDING';

  // Restriction: a user may not request tutoring for a course they themselves
  // teach (their own TutorExpertise) — i.e. they cannot "buy" their own
  // course — nor be assigned as their own tutor.
  const teachesCourse = await prisma.tutorExpertise.findFirst({
    where: { tutorId: studentId, courseId },
    select: { id: true },
  });
  if (teachesCourse || (tutorId && tutorId === studentId)) {
    return { error: 'You cannot request tutoring for a course you teach.' };
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
  // Unified dashboard: both STUDENT and TUTOR may use these actions; only
  // guests and ADMINs are blocked. Mirrors the /student layout + page gate
  // and the submitPayment action.
  if (!session || (session.user as any).role === 'ADMIN') {
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

    // Send discord notification (non-blocking, env-driven)
    try {
      const webhookUrl = process.env.DISCORD_REQUESTS_WEBHOOK;
      if (webhookUrl) {
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
      }
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

  const parsed = parseFormData(formData, submitPaymentSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const { requestId, mfsType, amount } = parsed.data;
  let { accountNumber, transactionId, walletAmount } = parsed.data;
  // Normalise empty optionals
  if (!accountNumber) accountNumber = 'WALLET';
  if (!transactionId) transactionId = `WLT-${Date.now()}`;
  if (!walletAmount) walletAmount = 0;

  const studentId = (session.user as any).id;

  try {
    let totalPaid = amount;
    let finalMfsType: string = mfsType;
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
    revalidatePath('/dashboard');        // refresh the sidebar Payments badge
    revalidatePath('/student/payments'); // refresh Pending Payments + History sections
    return { success: true };
  } catch (err) {
    console.error('Submit payment error:', err);
    return { error: 'Failed to submit payment details.' };
  }
}

export async function completeTutorRequest(requestId: string, rating?: number | null, review?: string | null) {
  const session = await getServerSession(authOptions);
  // Unified dashboard: both STUDENT and TUTOR may use these actions; only
  // guests and ADMINs are blocked. Mirrors the /student layout + page gate
  // and the submitPayment action.
  if (!session || (session.user as any).role === 'ADMIN') {
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
  // Unified dashboard: both STUDENT and TUTOR may use these actions; only
  // guests and ADMINs are blocked. Mirrors the /student layout + page gate
  // and the submitPayment action.
  if (!session || (session.user as any).role === 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  const parsed = parseFormData(formData, submitRefundRequestSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const { requestId, details } = parsed.data;

  const studentId = (session.user as any).id;

  try {
    // Verify the request belongs to this student and is in a paid state.
    const request = await prisma.tutorRequest.findFirst({
      where: { id: requestId, studentId },
      select: { id: true, status: true },
    });

    if (!request) {
      return { error: 'Request not found.' };
    }

    // Refunds are only allowed for sessions the student has actually paid
    // for (or is in the process of paying). PENDING/CANCELLED requests have
    // no money to return.
    const paidStatuses = ['MATCHED', 'PAYMENT_PENDING', 'ACCEPTED', 'COMPLETED'];
    if (!paidStatuses.includes(request.status)) {
      return { error: 'This session is not eligible for a refund.' };
    }

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
        details,
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
