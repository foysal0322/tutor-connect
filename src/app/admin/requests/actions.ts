'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createNotification } from '@/lib/notification';
import { sendNoReplyEmail } from '@/lib/mail';
import { dispatch } from '@/lib/notifications/service';

export async function assignTutorToRequest(requestId: string, tutorId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  const request = await prisma.tutorRequest.findUnique({
    where: { id: requestId },
    include: {
      student: true,
      course: true,
    }
  });

  const tutor = await prisma.user.findUnique({
    where: { id: tutorId }
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

  if (request) {
    const finalFee = newBudget !== undefined ? newBudget : request.budget;

    // Send push notification to student
    try {
      await createNotification(
        request.studentId,
        "Tutor Assigned!",
        `A tutor has been assigned for your request (${request.topic}). The final fee is ${finalFee} BDT.`,
        `/student`
      );
    } catch (err) {
      console.error("Failed to notify student:", err);
    }

    // Send no-reply email to student
    try {
      await sendNoReplyEmail({
        to: request.student.email,
        subject: `Tutor Assigned: ${request.course.name} (${request.topic})`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">Tutor Allocated!</h2>
            <p>Hello ${request.student.name},</p>
            <p>Great news! We have assigned a qualified tutor for your request on <strong>${request.topic} (${request.course.name})</strong>.</p>
            <p><strong>Assigned Tutor:</strong> ${tutor?.name || 'Assigned Tutor'}</p>
            <p><strong>Session Fee:</strong> ${finalFee} BDT</p>
            <p>Please log in to your student dashboard to proceed with the payment and start learning.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.error("Failed to send allocation email to student:", mailErr);
    }

    // Send no-reply email and push notification to tutor
    if (tutor) {
      try {
        await dispatch({
          event: 'tutor.allocated',
          userId: tutorId,
          title: 'New Tuition Allocation!',
          message: `You have been assigned a new tuition request for ${request.topic} (${request.course.name}). Session fee: ${finalFee} BDT.`,
          actionUrl: '/tutor',
          type: 'SUCCESS',
          category: 'BOOKING',
          priority: 'HIGH',
          actorUserId: (session.user as any).id,
          recipientRoleHint: 'TUTOR',
          metadata: {
            requestId: request.id,
            courseId: request.courseId,
            studentId: request.studentId,
            sessionFee: finalFee,
          },
        });
      } catch (err) {
        console.error("Failed to notify tutor:", err);
      }

      try {
        await sendNoReplyEmail({
          to: tutor.email,
          subject: `New Tuition Allocation: ${request.course.name} (${request.topic})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #10b981;">New Student Allocation!</h2>
              <p>Hello ${tutor.name},</p>
              <p>You have been allocated a new tuition request for <strong>${request.topic} (${request.course.name})</strong>.</p>
              <p><strong>Student Name:</strong> ${request.student.name}</p>
              <p><strong>Session Fee:</strong> ${finalFee} BDT</p>
              <p>Please log in to your tutor dashboard to review the request details.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error("Failed to send allocation email to tutor:", mailErr);
      }
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
    const request = await prisma.tutorRequest.findUnique({
      where: { id: requestId },
      include: { student: true, assignedTutor: true, course: true }
    });

    if (approve) {
      await prisma.tutorRequest.update({
        where: { id: requestId },
        data: { status: 'ACCEPTED' }
      });

      if (request) {
        try {
          await sendNoReplyEmail({
            to: request.student.email,
            subject: `Payment Verified: ${request.course.name} (${request.topic})`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #10b981;">Payment Accepted!</h2>
                <p>Hello ${request.student.name},</p>
                <p>Your payment for tuition request <strong>${request.topic} (${request.course.name})</strong> has been verified and accepted.</p>
                <p>Your session is now active! You can contact your assigned tutor and begin classes.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
              </div>
            `
          });
          if (request.assignedTutor) {
            await sendNoReplyEmail({
              to: request.assignedTutor.email,
              subject: `Payment Verified for Student: ${request.student.name}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                  <h2 style="color: #10b981;">Student Payment Verified!</h2>
                  <p>Hello ${request.assignedTutor.name},</p>
                  <p>The student <strong>${request.student.name}</strong> has completed payment for <strong>${request.topic} (${request.course.name})</strong>.</p>
                  <p>You can now start conducting tuition sessions.</p>
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                  <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
                </div>
              `
            });
          }

        // Phase 6/7: in-app + push notifications to student and tutor
        // (additive — the emails above are unchanged). Previously these
        // payment-verified events only went out via email; the bell never
        // surfaced them.
        try {
          await dispatch({
            event: 'payment.verified',
            userId: request.studentId,
            title: 'Payment Verified',
            message: `Your payment for ${request.topic} (${request.course.name}) was verified. Your session is now active.`,
            actionUrl: '/student',
            type: 'SUCCESS',
            category: 'PAYMENT',
            priority: 'CRITICAL',
            actorUserId: (session.user as any).id,
            recipientRoleHint: 'STUDENT',
            metadata: { requestId: request.id, courseId: request.courseId },
          });
        } catch (err) {
          console.error('Failed to notify student of payment verification:', err);
        }

        if (request.assignedTutorId) {
          try {
            await dispatch({
              event: 'tutor.payment_verified',
              userId: request.assignedTutorId,
              title: 'Student Payment Verified',
              message: `${request.student.name}'s payment for ${request.topic} (${request.course.name}) was verified. You can start sessions now.`,
              actionUrl: '/tutor',
              type: 'SUCCESS',
              category: 'PAYMENT',
              priority: 'HIGH',
              actorUserId: (session.user as any).id,
              recipientRoleHint: 'TUTOR',
              metadata: { requestId: request.id, courseId: request.courseId, studentId: request.studentId },
            });
          } catch (err) {
            console.error('Failed to notify tutor of payment verification:', err);
          }
        }
        } catch (mailErr) {
          console.error("Failed to send payment verification emails:", mailErr);
        }
      }
    } else {
      // Rejection: delete the payment record and set request status back to MATCHED
      await prisma.payment.delete({
        where: { requestId }
      });

      await prisma.tutorRequest.update({
        where: { id: requestId },
        data: { status: 'MATCHED' }
      });

      if (request) {
        try {
          await sendNoReplyEmail({
            to: request.student.email,
            subject: `Payment Verification Failed: ${request.course.name}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #ef4444;">Payment Verification Failed</h2>
                <p>Hello ${request.student.name},</p>
                <p>We could not verify your payment transaction for <strong>${request.topic} (${request.course.name})</strong>.</p>
                <p>Please log in to your dashboard, check your transaction ID, and re-submit your payment details.</p>
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
              </div>
            `
          });
        } catch (mailErr) {
          console.error("Failed to send payment failure email:", mailErr);
        }

        // Phase 7: in-app + push to student (additive — email above unchanged).
        try {
          await dispatch({
            event: 'payment.rejected',
            userId: request.studentId,
            title: 'Payment Could Not Be Verified',
            message: `We couldn't verify your payment for ${request.topic} (${request.course.name}). Please check your transaction ID and resubmit.`,
            actionUrl: '/student/payments',
            type: 'WARNING',
            category: 'PAYMENT',
            priority: 'HIGH',
            actorUserId: (session.user as any).id,
            recipientRoleHint: 'STUDENT',
            metadata: { requestId: request.id, courseId: request.courseId },
          });
        } catch (err) {
          console.error('Failed to notify student of payment rejection:', err);
        }
      }
    }

    revalidatePath('/admin/requests');
    return { success: true };
  } catch (err) {
    console.error('Verify payment error:', err);
    return { error: 'Failed to verify payment.' };
  }
}

export async function verifyRefundAction(
  refundRequestId: string,
  approve: boolean,
  reviewNote?: string,
) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  const adminId = (session.user as any).id;
  const note = reviewNote?.trim() || null;

  try {
    // Fetch with all relations needed for the credit + email.
    const refundRequest = await prisma.refundRequest.findUnique({
      where: { id: refundRequestId },
      include: {
        student: true,
        request: { include: { course: true } },
      },
    });

    if (!refundRequest) {
      return { error: 'Refund request not found.' };
    }

    // Idempotency guard — only PENDING rows can be actioned.
    if (refundRequest.status !== 'PENDING') {
      return { error: `This refund request has already been ${refundRequest.status.toLowerCase()}.` };
    }

    const resolvedAt = new Date();

    if (approve) {
      // Refund the session fee only (platform keeps the 5% fee).
      const refundAmount = refundRequest.request.budget;

      await prisma.$transaction([
        // 1. Credit the student's wallet.
        prisma.user.update({
          where: { id: refundRequest.studentId },
          data: { balance: { increment: refundAmount } },
        }),
        // 2. Record the refund as a wallet transaction (auditable).
        prisma.walletTransaction.create({
          data: {
            userId: refundRequest.studentId,
            amount: refundAmount,
            type: 'REFUND',
            description: `Refund for ${refundRequest.request.course.name} — ${refundRequest.request.topic || 'session'}`,
            referenceId: refundRequest.id,
          },
        }),
        // 3. Mark the refund request approved with audit metadata.
        prisma.refundRequest.update({
          where: { id: refundRequestId },
          data: {
            status: 'APPROVED',
            amount: refundAmount,
            reviewNote: note,
            resolvedAt,
            processedById: adminId,
          },
        }),
        // 4. Cancel the underlying tutoring request.
        prisma.tutorRequest.update({
          where: { id: refundRequest.requestId },
          data: { status: 'CANCELLED' },
        }),
      ]);

      // Notify the student (push + email). Fire-and-forget.
      try {
        await dispatch({
          event: 'refund.approved',
          userId: refundRequest.studentId,
          title: 'Refund Approved',
          message: `${refundAmount} BDT has been credited to your wallet${note ? ` — ${note}` : '.'}`,
          actionUrl: '/wallet',
          type: 'SUCCESS',
          category: 'REFUND',
          priority: 'CRITICAL',
          actorUserId: adminId,
          recipientRoleHint: 'STUDENT',
          metadata: {
            refundRequestId: refundRequest.id,
            requestId: refundRequest.requestId,
            amount: refundAmount,
            reviewNote: note,
          },
        });
      } catch (err) {
        console.error('Failed to notify student of refund approval:', err);
      }
    } else {
      await prisma.refundRequest.update({
        where: { id: refundRequestId },
        data: {
          status: 'REJECTED',
          reviewNote: note,
          resolvedAt,
          processedById: adminId,
        },
      });

      try {
        await dispatch({
          event: 'refund.rejected',
          userId: refundRequest.studentId,
          title: 'Refund Request Rejected',
          message: note
            ? `Your refund request was rejected — ${note}`
            : 'Your refund request was rejected. Please contact support if you have questions.',
          actionUrl: '/student',
          type: 'REJECTION',
          category: 'REFUND',
          priority: 'HIGH',
          actorUserId: adminId,
          recipientRoleHint: 'STUDENT',
          metadata: {
            refundRequestId: refundRequest.id,
            requestId: refundRequest.requestId,
            reviewNote: note,
          },
        });
      } catch (err) {
        console.error('Failed to notify student of refund rejection:', err);
      }
    }

    try {
      const statusText = approve ? 'APPROVED' : 'REJECTED';
      const amountLine = approve
        ? `<p><strong>${refundRequest.request.budget} BDT</strong> has been credited to your NSUone wallet and is available immediately.</p>`
        : '';
      const noteLine = note
        ? `<p style="background:#f8fafc;padding:0.75rem;border-radius:6px;border:1px solid #e2e8f0;"><strong>Admin note:</strong> ${note}</p>`
        : '';
      await sendNoReplyEmail({
        to: refundRequest.student.email,
        subject: `Refund Request ${statusText}: ${refundRequest.request.course.name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: ${approve ? '#10b981' : '#ef4444'};">Refund Request ${statusText}</h2>
            <p>Hello ${refundRequest.student.name},</p>
            <p>Your refund request for course <strong>${refundRequest.request.course.name}</strong> has been <strong>${statusText}</strong>.</p>
            ${amountLine}
            ${noteLine}
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('Failed to send refund status email:', mailErr);
    }

    revalidatePath('/admin/requests');
    revalidatePath('/student');
    revalidatePath('/wallet');
    return { success: true };
  } catch (err) {
    console.error('Verify refund error:', err);
    return { error: 'Failed to verify refund.' };
  }
}
