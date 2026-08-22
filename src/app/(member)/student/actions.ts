'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { notifyNewCourseRequest, notifyPaymentSubmission, notifyRefundRequest } from '@/lib/discord';
import { notifyAdmins } from '@/lib/notifications/admin';
import { dispatch } from '@/lib/notifications/service';
import {
  parseFormData,
  submitTutorRequestSchema,
  submitPaymentSchema,
  submitRefundRequestSchema,
} from '@/lib/validation';
import { redeemCoupon } from '@/lib/coupon';

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

      // Phase 5: in-app admin notification (additive — Discord ping above is unchanged).
      await notifyAdmins({
        event: 'tutor_request.submitted',
        title: 'New Tutor Request',
        message: `${studentName} requested ${course.name} — "${topic || 'General Help'}" (${budget} BDT).`,
        actionUrl: '/admin/requests',
        type: 'ACTION_REQUIRED',
        category: 'TUTOR_REQUEST',
        priority: 'HIGH',
        actorUserId: studentId,
        metadata: { requestId: undefined, courseId, budget },
      });
    }

    // Phase 7: in-app receipt to the student (previously they got nothing in
    // their own bell for submitting a request — only admins heard via Discord).
    try {
      await dispatch({
        event: 'tutor_request.submitted_receipt',
        userId: studentId,
        title: 'Tutor Request Submitted',
        message: tutorId
          ? `Your request for ${course?.name ?? 'a course'} was submitted and a tutor has been assigned. We'll notify you once payment is verified.`
          : `Your request for ${course?.name ?? 'a course'} was submitted. We'll match you with a tutor and notify you.`,
        actionUrl: '/student',
        type: 'INFO',
        category: 'TUTOR_REQUEST',
        priority: 'LOW',
        recipientRoleHint: 'STUDENT',
        metadata: { courseId, budget, assignedTutorId: tutorId },
      });
    } catch (err) {
      console.error('Failed to send student tutor-request receipt:', err);
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

      // Phase 5: in-app admin notification (additive — Discord webhook above is unchanged).
      const studentName = session.user?.name || 'A student';
      await notifyAdmins({
        event: 'tutor_request.cancelled',
        title: 'Tutor Request Cancelled',
        message: `${studentName} cancelled their request for ${existing.course.name} — "${existing.topic || 'General Help'}".`,
        actionUrl: '/admin/requests',
        type: 'INFO',
        category: 'TUTOR_REQUEST',
        priority: 'MEDIUM',
        actorUserId: studentId,
        metadata: { requestId: id },
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

  // Optional TUITION coupon code. Validated + redeemed inside the
  // transaction below; ignored if blank.
  const couponCode = ((formData.get('couponCode') as string) || '').trim();

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

    // Interactive transaction — converted from array form so the TUITION
    // coupon can be redeemed atomically with the payment record. Coupon
    // is applied as cashback: the student pays the full displayed total,
    // then the coupon discount is credited back to their wallet inside
    // the same transaction. Coupon errors bubble up and abort the payment.
    let couponDiscount = 0;
    await prisma.$transaction(async (tx) => {
      await tx.payment.upsert({
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
      });
      await tx.tutorRequest.update({
        where: { id: requestId },
        data: { status: newStatus }
      });

      if (couponCode && totalPaid > 0) {
        couponDiscount = await redeemCoupon(tx, {
          code: couponCode,
          scope: 'TUITION',
          amount: totalPaid,
          userId: studentId,
          reference: requestId,
        });
        if (couponDiscount > 0) {
          await tx.user.update({
            where: { id: studentId },
            data: { balance: { increment: couponDiscount } },
          });
          await tx.walletTransaction.create({
            data: {
              userId: studentId,
              amount: couponDiscount,
              type: 'COUPON_DISCOUNT',
              description: `Coupon ${couponCode.toUpperCase()} cashback on tuition payment #${requestId.slice(-6)}`,
              referenceId: requestId,
            },
          });
        }
      }
    });

    try {
      const studentName = session.user?.name || 'A student';
      await notifyPaymentSubmission({
        amount: totalPaid,
        method: finalMfsType,
        transactionId: sanitizedTransactionId,
        studentName,
      });

      // Phase 5: in-app admin notification (additive — Discord ping above is unchanged).
      await notifyAdmins({
        event: 'payment.submitted',
        title: 'Payment Submitted',
        message: `${studentName} submitted a ${totalPaid} BDT ${finalMfsType} payment (txn ${sanitizedTransactionId}).`,
        actionUrl: '/admin/requests',
        type: 'ACTION_REQUIRED',
        category: 'PAYMENT',
        priority: 'HIGH',
        actorUserId: studentId,
        channels: ['IN_APP', 'PUSH', 'SMS'],
        metadata: { requestId, transactionId: sanitizedTransactionId, amount: totalPaid, method: finalMfsType },
      });

      // Phase 7: in-app receipt to the student (previously the student got
      // no confirmation in their own bell — only admins heard via Discord).
      const instantlyVerified = newStatus === 'ACCEPTED';
      await dispatch({
        event: 'payment.submitted_receipt',
        userId: studentId,
        title: 'Payment Submitted',
        message: instantlyVerified
          ? `Your ${totalPaid} BDT ${finalMfsType} payment was submitted and auto-verified. Your session is now active.`
          : `Your ${totalPaid} BDT ${finalMfsType} payment was submitted. We'll notify you once it's verified.`,
        actionUrl: '/student/payments',
        type: instantlyVerified ? 'SUCCESS' : 'INFO',
        category: 'PAYMENT',
        priority: 'MEDIUM',
        recipientRoleHint: 'STUDENT',
        metadata: {
          requestId,
          amount: totalPaid,
          method: finalMfsType,
          transactionId: sanitizedTransactionId,
          autoVerified: instantlyVerified,
          couponDiscount,
        },
      }).catch((err) => {
        console.error('Failed to send student payment receipt:', err);
      });

      // 100% wallet payments skip admin verification and go straight to
      // ACCEPTED — notify the assigned tutor here, mirroring the
      // tutor.payment_verified dispatch in admin verifyPaymentAction.
      if (instantlyVerified) {
        try {
          const req = await prisma.tutorRequest.findUnique({
            where: { id: requestId },
            select: {
              topic: true,
              courseId: true,
              assignedTutorId: true,
              course: { select: { name: true } },
            },
          });
          if (req?.assignedTutorId) {
            await dispatch({
              event: 'tutor.payment_verified',
              userId: req.assignedTutorId,
              title: 'Student Payment Verified — Session Active',
              message: `${studentName}'s wallet payment for ${req.topic || req.course.name} (${req.course.name}) was auto-verified. You can start teaching now.`,
              actionUrl: '/tutor',
              type: 'SUCCESS',
              category: 'PAYMENT',
              priority: 'HIGH',
              actorUserId: studentId,
              recipientRoleHint: 'TUTOR',
              channels: ['IN_APP', 'PUSH', 'SMS'],
              metadata: { requestId, courseId: req.courseId, studentId },
            });
          }
        } catch (err) {
          console.error('Failed to notify tutor of auto-verified payment:', err);
        }
      }
    } catch (err) {
      console.error('Failed to send payment discord notification', err);
    }

    revalidatePath('/student');
    revalidatePath('/wallet');
    revalidatePath('/dashboard');        // refresh the sidebar Payments badge
    revalidatePath('/student/payments'); // refresh Pending Payments + History sections
    return {
      success: true,
      couponDiscount:
        couponDiscount > 0
          ? `${couponDiscount} BDT cashback credited to your wallet from coupon ${couponCode.toUpperCase()}.`
          : undefined,
    };
  } catch (err) {
    // Coupon errors carry a user-facing message.
    if (err instanceof Error && err.message) {
      return { error: err.message };
    }
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
      select: {
        id: true,
        status: true,
        topic: true,
        budget: true,
        assignedTutorId: true,
        course: { select: { name: true } },
      }
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

    // Flip status AND credit the tutor's wallet in one transaction so the
    // balance update can never diverge from the status change. The status
    // guard above (status !== 'ACCEPTED') makes this idempotent — a repeat
    // call returns early before reaching here.
    await prisma.$transaction(async (tx) => {
      await tx.tutorRequest.update({
        where: { id: requestId },
        data: updateData,
      });

      if (request.assignedTutorId && request.budget > 0) {
        await tx.user.update({
          where: { id: request.assignedTutorId },
          data: { balance: { increment: request.budget } },
        });
        await tx.walletTransaction.create({
          data: {
            userId: request.assignedTutorId,
            amount: request.budget,
            type: 'EARNING_CREDIT',
            referenceId: requestId,
            description: `Session completed: ${request.topic || request.course.name}`,
          },
        });
      }
    });

    // Phase 6: notify the assigned tutor (and admins) that the session was
    // completed. Previously this transition was silent to the tutor even
    // though it directly affects their earnings.
    if (request.assignedTutorId) {
      try {
        await dispatch({
          event: 'tutor.session_completed',
          userId: request.assignedTutorId,
          title: 'Session Marked Complete',
          message: `Your student marked "${request.topic || 'session'}" (${request.course.name}) as complete.${rating ? ` They rated you ${rating}/5.` : ''}`,
          actionUrl: '/tutor',
          type: 'SUCCESS',
          category: 'BOOKING',
          priority: 'MEDIUM',
          actorUserId: studentId,
          recipientRoleHint: 'TUTOR',
          metadata: {
            requestId,
            rating: rating ?? null,
            hasReview: !!(review && review.trim()),
          },
        });
      } catch (err) {
        console.error('Failed to notify tutor of session completion:', err);
      }
    }

    try {
      await notifyAdmins({
        event: 'tutor_request.completed',
        title: 'Session Completed',
        message: `A tutoring session for "${request.topic || 'session'}" (${request.course.name}) was marked complete by the student.${rating ? ` Rating: ${rating}/5.` : ''}`,
        actionUrl: '/admin/requests',
        type: 'INFO',
        category: 'BOOKING',
        priority: 'LOW',
        actorUserId: studentId,
        metadata: { requestId, assignedTutorId: request.assignedTutorId, rating: rating ?? null },
      });
    } catch (err) {
      console.error('Failed to notify admins of session completion:', err);
    }

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

      // Phase 5: in-app admin notification (additive — Discord ping above is unchanged).
      await notifyAdmins({
        event: 'refund.submitted',
        title: 'Refund Request Submitted',
        message: `${studentName} requested a refund: "${details.trim().slice(0, 140)}".`,
        actionUrl: '/admin/requests',
        type: 'ACTION_REQUIRED',
        category: 'REFUND',
        priority: 'HIGH',
        actorUserId: studentId,
        metadata: { requestId, refundRequestDetails: details.trim() },
      });

      // Phase 7: in-app receipt to the student (previously silent in their bell).
      await dispatch({
        event: 'refund.submitted_receipt',
        userId: studentId,
        title: 'Refund Request Submitted',
        message: `Your refund request was received and is now pending review. We'll notify you once it's processed.`,
        actionUrl: '/student',
        type: 'INFO',
        category: 'REFUND',
        priority: 'MEDIUM',
        recipientRoleHint: 'STUDENT',
        metadata: { requestId, details: details.trim() },
      }).catch((err) => {
        console.error('Failed to send student refund receipt:', err);
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

/**
 * Student-initiated cancellation of their OWN pending refund request.
 *
 * The student withdraws the refund ask *before* an admin actioned it. Once
 * APPROVED/REJECTED the refund is no longer cancellable — the admin has
 * already moved money / made a decision. We delete the PENDING row because
 * the RefundRequest model has no CANCELLED status and a deleted row means
 * the student is free to re-request later if they change their mind again.
 */
export async function cancelRefundRequest(refundRequestId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role === 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  const studentId = (session.user as any).id;

  try {
    // Verify ownership + PENDING state in one query (cheap, secure).
    const refund = await prisma.refundRequest.findFirst({
      where: { id: refundRequestId, studentId },
      select: { id: true, status: true, requestId: true, details: true },
    });

    if (!refund) {
      return { error: 'Refund request not found.' };
    }
    if (refund.status !== 'PENDING') {
      return { error: 'This refund has already been processed and cannot be cancelled.' };
    }

    // Atomically delete the pending refund row. No money has moved yet (the
    // wallet credit only happens on admin approval), so this is safe.
    await prisma.refundRequest.delete({ where: { id: refund.id } });

    try {
      const studentName = session.user?.name || 'A student';
      // Tell admins so they don't action a refund the student no longer wants.
      await notifyAdmins({
        event: 'refund.cancelled_by_student',
        title: 'Refund Request Cancelled',
        message: `${studentName} withdrew their pending refund request.`,
        actionUrl: '/admin/requests',
        type: 'INFO',
        category: 'REFUND',
        priority: 'MEDIUM',
        actorUserId: studentId,
        metadata: { requestId: refund.requestId, refundRequestId: refund.id },
      });

      // Receipt to the student.
      await dispatch({
        event: 'refund.cancelled_receipt',
        userId: studentId,
        title: 'Refund Request Cancelled',
        message: `Your refund request was cancelled. The session is active again — you can re-request a refund later if needed.`,
        actionUrl: '/student',
        type: 'INFO',
        category: 'REFUND',
        priority: 'LOW',
        recipientRoleHint: 'STUDENT',
        metadata: { requestId: refund.requestId },
      }).catch((err) => {
        console.error('Failed to send refund-cancel receipt:', err);
      });
    } catch (err) {
      console.error('Failed to send refund-cancel notifications:', err);
    }

    revalidatePath('/student');
    return { success: true };
  } catch (err) {
    console.error('Cancel refund request error:', err);
    return { error: 'Failed to cancel refund request.' };
  }
}
