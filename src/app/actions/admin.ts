'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath, updateTag } from 'next/cache';
import { dispatch } from '@/lib/notifications/service';
import { DEFAULT_SETTINGS } from '@/lib/cache';
import { sendNoReplyEmail } from '@/lib/mail';
import { parseFormData, adjustWalletSchema } from '@/lib/validation';

export async function adminUpdateUser(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  const userId = formData.get('userId') as string;
  if (!userId) {
    return { error: 'User ID is required.' };
  }

  const name = formData.get('name') as string;
  const nsuId = formData.get('nsuId') as string;
  const email = formData.get('email') as string;
  const contact = formData.get('contact') as string;
  const gender = formData.get('gender') as string;
  const departmentId = formData.get('departmentId') as string;
  const role = formData.get('role') as string;
  
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  
  const updateData: any = { name, nsuId, email, contact, gender };

  // Fetch the current role before update so we can detect a role change
  // and notify the user (Phase 6/7 — previously role changes were silent).
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true, name: true },
  });

  if (role) {
    updateData.role = role;
  }
  
  if (departmentId) {
    updateData.departmentId = departmentId;
  }

  if (role === 'TUTOR' || (!role && formData.get('cgpa'))) {
    const cgpa = formData.get('cgpa');
    if (cgpa) {
      updateData.cgpa = parseFloat(cgpa as string);
    }
  }

  if (password) {
    if (password !== confirmPassword) {
      return { error: 'Passwords do not match.' };
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: updateData
    });
  } catch (err: any) {
    if (err.code === 'P2002') {
      const target = err.meta?.target as string[];
      if (target?.includes('email')) {
        return { error: 'Email is already in use by another user.' };
      }
      if (target?.includes('nsuId')) {
        return { error: 'NSU ID is already in use by another user.' };
      }
      return { error: 'A user with this information already exists.' };
    }
    return { error: 'Failed to update user profile.' };
  }

  // Phase 6/7: notify the user when their role was changed. Previously this
  // critical account event was silent. Wrapped so it never affects the update.
  if (role && before && before.role !== role) {
    try {
      await dispatch({
        event: 'user.role_changed',
        userId,
        title: 'Your Account Role Has Changed',
        message: `Your role on NSUone was updated from ${before.role} to ${role} by an administrator.`,
        actionUrl: '/dashboard',
        type: 'CRITICAL',
        category: 'AUTH',
        priority: 'CRITICAL',
        actorUserId: (session.user as any).id,
        recipientRoleHint: (role as any) === 'TUTOR' ? 'TUTOR' : (role as any) === 'ADMIN' ? 'ADMIN' : 'STUDENT',
        metadata: { previousRole: before.role, newRole: role },
      });
    } catch (err) {
      console.error('Failed to notify user of role change:', err);
    }
  }

  revalidatePath('/admin/users');
  revalidatePath(`/admin/users/${userId}`);
  return { success: true };
}

export async function addDepartment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  const name = formData.get('name') as string;
  if (!name) return { error: 'Name is required' };
  try {
    await prisma.department.create({ data: { name } });
    revalidatePath('/admin/departments');
    updateTag('departments');
    return { success: true };
  } catch (err: any) {
    if (err.code === 'P2002') return { error: 'Department already exists' };
    return { error: 'Failed to add department' };
  }
}

export async function updateDepartment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  if (!id || !name) return { error: 'ID and Name are required' };
  try {
    await prisma.department.update({ where: { id }, data: { name } });
    revalidatePath('/admin/departments');
    updateTag('departments');
    return { success: true };
  } catch (err: any) {
    if (err.code === 'P2002') return { error: 'Department already exists' };
    return { error: 'Failed to update department' };
  }
}

export async function deleteDepartment(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  try {
    await prisma.department.delete({ where: { id } });
    revalidatePath('/admin/departments');
    updateTag('departments');
    return { success: true };
  } catch (err: any) {
    return { error: 'Cannot delete department. It may have associated courses or users.' };
  }
}

export async function addCourse(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  const name = formData.get('name') as string;
  if (!name) return { error: 'Name is required' };
  try {
    await prisma.course.create({ data: { name } });
    revalidatePath('/admin/courses');
    updateTag('courses');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to add course' };
  }
}

export async function updateCourse(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  const id = formData.get('id') as string;
  const name = formData.get('name') as string;
  if (!id || !name) return { error: 'ID and Name are required' };
  try {
    await prisma.course.update({ where: { id }, data: { name } });
    revalidatePath('/admin/courses');
    updateTag('courses');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to update course' };
  }
}

export async function deleteCourse(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  try {
    await prisma.course.delete({ where: { id } });
    revalidatePath('/admin/courses');
    updateTag('courses');
    return { success: true };
  } catch (err: any) {
    return { error: 'Cannot delete course. It may have associated requests or expertises.' };
  }
}

export async function importCourses(courses: { name: string }[]) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  if (!courses || courses.length === 0) return { error: 'No courses provided' };
  
  try {
    const existingCourses = await prisma.course.findMany({
      select: { name: true }
    });
    const existingNames = new Set(existingCourses.map(c => c.name));
    
    const newCourses = courses
      .filter(c => !existingNames.has(c.name))
      .map(c => ({ name: c.name }));

    if (newCourses.length > 0) {
      await prisma.course.createMany({
        data: newCourses
      });
    }

    revalidatePath('/admin/courses');
    updateTag('courses');
    return { success: true };
  } catch (err: any) {
    console.error('Import courses error:', err);
    return { error: 'Failed to import courses: ' + err.message };
  }
}

export async function toggleBlockUser(userId: string, block: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: block },
      select: { id: true, role: true, name: true },
    });

    // Phase 6/7: notify the user that their account access changed. A blocked
    // user may not see the row until they're reinstated, but it's recorded
    // for audit + appears on unblock. Critical priority = non-suppressible.
    try {
      await dispatch({
        event: block ? 'user.blocked' : 'user.unblocked',
        userId,
        title: block ? 'Your Account Has Been Blocked' : 'Your Account Has Been Restored',
        message: block
          ? 'Your NSUone account has been blocked by an administrator. Please contact support if you believe this is an error.'
          : 'Your NSUone account has been restored. You can resume using the platform normally.',
        actionUrl: '/contact',
        type: 'CRITICAL',
        category: 'SECURITY',
        priority: 'CRITICAL',
        actorUserId: (session.user as any).id,
        recipientRoleHint: (user.role as any) === 'TUTOR' ? 'TUTOR' : 'STUDENT',
        metadata: { previousBlocked: !block, newBlocked: block },
      });
    } catch (err) {
      console.error('Failed to notify user of block status change:', err);
    }

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to update user block status' };
  }
}

export async function deleteBulkCourses(ids: string[]) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');
  if (!ids || ids.length === 0) return { error: 'No courses selected' };
  
  try {
    await prisma.course.deleteMany({
      where: { id: { in: ids } }
    });
    revalidatePath('/admin/courses');
    updateTag('courses');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to delete some courses. They might be in use.' };
  }
}

export async function deleteUser(userId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') throw new Error('Not authorized');

  try {
    await prisma.$transaction(async (tx) => {
      await tx.refundRequest.deleteMany({ where: { studentId: userId } });
      await tx.consultancyRequest.deleteMany({ where: { studentId: userId } });

      const studentRequests = await tx.tutorRequest.findMany({ where: { studentId: userId } });
      const requestIds = studentRequests.map(r => r.id);
      if (requestIds.length > 0) {
        await tx.refundRequest.deleteMany({ where: { requestId: { in: requestIds } } });
      }
      await tx.tutorRequest.deleteMany({ where: { studentId: userId } });

      await tx.tutorRequest.updateMany({
        where: { assignedTutorId: userId },
        data: { assignedTutorId: null, status: 'PENDING' }
      });

      await tx.tutorExpertise.deleteMany({ where: { tutorId: userId } });
      await tx.user.delete({ where: { id: userId } });
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to delete user.' };
  }
}

/**
 * Direct admin adjustment of a user's wallet balance. Credits or debits the
 * given amount, records the change as a WalletTransaction (type
 * ADMIN_ADJUSTMENT) with the admin's reason, and notifies the user.
 *
 * The wallet mutation + transaction row are written atomically; for DEBIT,
 * the server rejects any amount that would push the balance below zero
 * (product decision — no negative balances).
 *
 * The signed delta (+amount / -amount) is stored on WalletTransaction.amount
 * so the existing transaction history rendering (which already signs amounts)
 * continues to work without special casing.
 */
export async function adjustUserBalance(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    return { error: 'Not authorized.' };
  }

  const adminId = (session.user as any).id;

  const parsed = parseFormData(formData, adjustWalletSchema);
  if (!parsed.ok) {
    return { error: parsed.error };
  }
  const { userId, direction, amount, reason } = parsed.data;

  const isCredit = direction === 'CREDIT';
  const signedDelta = isCredit ? amount : -amount;

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Lock + read the current balance inside the transaction. SELECT FOR
      // UPDATE semantics come from Prisma's interactive tx on Postgres.
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, balance: true, role: true },
      });

      if (!user) {
        throw new Error('NOT_FOUND');
      }

      if (user.role === 'ADMIN') {
        throw new Error('ADMIN_BLOCKED');
      }

      // Server-authoritative guard: debits cannot push the balance negative.
      if (!isCredit && user.balance - amount < 0) {
        throw new Error(`INSUFFICIENT:${user.balance}`);
      }

      const updated = await tx.user.update({
        where: { id: userId },
        data: { balance: { increment: signedDelta } },
        select: { balance: true },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          amount: signedDelta,
          type: 'ADMIN_ADJUSTMENT',
          description: reason,
          referenceId: adminId,
        },
      });

      return { user, newBalance: updated.balance };
    });

    // Notify the user (push + email). Fire-and-forget.
    const verb = isCredit ? 'credited to' : 'debited from';
    try {
      await dispatch({
        event: 'wallet.adjusted',
        userId,
        title: isCredit ? 'Wallet Credited' : 'Wallet Debited',
        message: `${amount} BDT has been ${verb} your wallet — ${reason}`,
        actionUrl: '/wallet',
        type: isCredit ? 'SUCCESS' : 'WARNING',
        category: 'WALLET',
        priority: 'HIGH',
        actorUserId: adminId,
        recipientRoleHint: result.user.role === 'TUTOR' ? 'TUTOR' : 'STUDENT',
        metadata: {
          amount,
          signedDelta,
          reason,
          newBalance: result.newBalance,
          direction,
        },
      });
    } catch (err) {
      console.error('Failed to notify user of wallet adjustment:', err);
    }

    try {
      await sendNoReplyEmail({
        to: result.user.email,
        subject: `Wallet ${isCredit ? 'Credit' : 'Debit'} — NSUone`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: ${isCredit ? '#10b981' : '#ef4444'};">Wallet ${isCredit ? 'Credit' : 'Debit'}</h2>
            <p>Hello ${result.user.name},</p>
            <p>An admin has ${verb} your wallet.</p>
            <p><strong>Amount:</strong> ${amount} BDT</p>
            <p><strong>New balance:</strong> ${result.newBalance} BDT</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">This is an automated message from NSUone. Please do not reply to this email.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('Failed to send wallet adjustment email:', mailErr);
    }

    revalidatePath('/admin/wallets');
    revalidatePath('/admin/users');
    revalidatePath('/wallet');
    return { success: true, newBalance: result.newBalance };
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'NOT_FOUND') return { error: 'User not found.' };
      if (err.message === 'ADMIN_BLOCKED') return { error: 'Admin wallets cannot be adjusted.' };
      if (err.message.startsWith('INSUFFICIENT:')) {
        const balance = err.message.split(':')[1];
        return {
          error: `Insufficient balance. User has ${balance} BDT — cannot debit ${amount} BDT.`,
        };
      }
    }
    console.error('Adjust wallet balance error:', err);
    return { error: 'Failed to adjust wallet balance.' };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Consultancy topics + requests
// ──────────────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }
  return session;
}

export async function addConsultancyTopic(formData: FormData) {
  await requireAdmin();
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const priceRaw = formData.get('price') as string;
  const isActive = formData.get('isActive') === 'on';

  if (!title) return { error: 'Title is required.' };
  const price = priceRaw ? parseFloat(priceRaw) : 0;
  if (Number.isNaN(price) || price < 0) return { error: 'Price must be a non-negative number.' };

  try {
    await prisma.consultancyTopic.create({
      data: { title, description, price, isActive },
    });
    revalidatePath('/admin/consultancy');
    revalidatePath('/consultancy');
    return { success: true };
  } catch (err: any) {
    if (err.code === 'P2002') return { error: 'A topic with this title already exists.' };
    return { error: 'Failed to add topic.' };
  }
}

export async function updateConsultancyTopic(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  const title = (formData.get('title') as string)?.trim();
  const description = (formData.get('description') as string)?.trim() || null;
  const priceRaw = formData.get('price') as string;
  const isActive = formData.get('isActive') === 'on';

  if (!id || !title) return { error: 'ID and title are required.' };
  const price = priceRaw ? parseFloat(priceRaw) : 0;
  if (Number.isNaN(price) || price < 0) return { error: 'Price must be a non-negative number.' };

  try {
    await prisma.consultancyTopic.update({
      where: { id },
      data: { title, description, price, isActive },
    });
    revalidatePath('/admin/consultancy');
    revalidatePath('/consultancy');
    return { success: true };
  } catch (err: any) {
    if (err.code === 'P2002') return { error: 'A topic with this title already exists.' };
    return { error: 'Failed to update topic.' };
  }
}

export async function deleteConsultancyTopic(id: string) {
  await requireAdmin();
  try {
    // Soft check — if any request references this topic, refuse so the
    // historical booking keeps its link. Admin can mark isActive=false to
    // hide it from the public page instead.
    const inUse = await prisma.consultancyRequest.count({ where: { topicId: id } });
    if (inUse > 0) {
      return {
        error: `${inUse} booking(s) reference this topic. Deactivate it instead of deleting.`,
      };
    }
    await prisma.consultancyTopic.delete({ where: { id } });
    revalidatePath('/admin/consultancy');
    revalidatePath('/consultancy');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to delete topic.' };
  }
}

export async function setConsultancyRequestStatus(id: string, status: string) {
  const session = await requireAdmin();
  if (!['PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return { error: 'Invalid status.' };
  }
  try {
    // Fetch before update so we can detect a real change and notify the student.
    const existing = await prisma.consultancyRequest.findUnique({
      where: { id },
      select: { studentId: true, status: true, topic: true },
    });
    if (!existing) {
      return { error: 'Consultancy request not found.' };
    }
    if (existing.status === status) {
      return { success: true };
    }

    await prisma.consultancyRequest.update({ where: { id }, data: { status } });

    // Phase 7: in-app notification to the student (previously silent). The
    // status vocabulary maps to a user-facing label.
    const statusLabel =
      status === 'ASSIGNED' ? 'assigned to a mentor'
      : status === 'COMPLETED' ? 'marked complete'
      : status === 'CANCELLED' ? 'cancelled'
      : 'updated';
    try {
      await dispatch({
        event: 'consultancy.status_changed',
        userId: existing.studentId,
        title: 'Consultancy Request Update',
        message: `Your consultancy request "${existing.topic}" was ${statusLabel} by an administrator.`,
        actionUrl: '/consultancy',
        type: status === 'COMPLETED' ? 'SUCCESS' : status === 'CANCELLED' ? 'WARNING' : 'INFO',
        category: 'CONSULTANCY',
        priority: 'HIGH',
        actorUserId: (session.user as any).id,
        recipientRoleHint: 'STUDENT',
        metadata: {
          consultancyRequestId: id,
          previousStatus: existing.status,
          newStatus: status,
        },
      });
    } catch (err) {
      console.error('Failed to notify student of consultancy status change:', err);
    }

    revalidatePath('/admin/consultancy');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to update request status.' };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Tutor expertise (admin edit)
// ──────────────────────────────────────────────────────────────────────────

export async function updateTutorExpertise(formData: FormData) {
  const session = await requireAdmin();
  const id = formData.get('id') as string;
  if (!id) return { error: 'ID is required.' };

  const courseId = formData.get('courseId') as string;
  const semesterCompleted = (formData.get('semesterCompleted') as string)?.trim();
  const facultyName = (formData.get('facultyName') as string)?.trim();
  const courseGrade = (formData.get('courseGrade') as string)?.trim();
  const availability = (formData.get('availability') as string)?.trim();
  const sessionFeeRaw = formData.get('sessionFee') as string;
  const hideGrade = formData.get('hideGrade') === 'on';
  const isActive = formData.get('isActive') === 'on';

  if (!courseId || !facultyName || !courseGrade) {
    return { error: 'Course, faculty, and grade are required.' };
  }
  const sessionFee = parseFloat(sessionFeeRaw);
  if (Number.isNaN(sessionFee) || sessionFee < 0) {
    return { error: 'Session fee must be a non-negative number.' };
  }

  try {
    // Fetch the existing row so we can notify the affected tutor (Phase 6 —
    // previously admin expertise edits were silent to the tutor).
    const existing = await prisma.tutorExpertise.findUnique({
      where: { id },
      select: { tutorId: true, courseId: true },
    });

    await prisma.tutorExpertise.update({
      where: { id },
      data: {
        courseId,
        semesterCompleted,
        facultyName,
        courseGrade,
        availability,
        sessionFee,
        hideGrade,
        isActive,
      },
    });

    if (existing) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
        select: { name: true },
      });
      try {
        await dispatch({
          event: 'tutor.expertise_updated',
          userId: existing.tutorId,
          title: 'Your expertise was updated by an admin',
          message: `An administrator updated your expertise for ${course?.name ?? 'a course'} (session fee ${sessionFee} BDT${isActive ? '' : ', now inactive'}).`,
          actionUrl: '/tutor/expertise',
          type: 'INFO',
          category: 'COURSE',
          priority: 'MEDIUM',
          actorUserId: (session.user as any).id,
          recipientRoleHint: 'TUTOR',
          metadata: {
            expertiseId: id,
            courseId,
            previousCourseId: existing.courseId,
            sessionFee,
            isActive,
          },
        });
      } catch (err) {
        console.error('Failed to notify tutor of expertise update:', err);
      }
    }

    revalidatePath('/admin/expertises');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to update expertise.' };
  }
}

export async function deleteTutorExpertise(id: string) {
  const session = await requireAdmin();
  try {
    // Fetch before deleting so we can notify the affected tutor (Phase 6 —
    // previously admin expertise deletions were silent to the tutor).
    const existing = await prisma.tutorExpertise.findUnique({
      where: { id },
      select: { tutorId: true, courseId: true },
    });

    await prisma.tutorExpertise.delete({ where: { id } });

    if (existing) {
      const course = await prisma.course.findUnique({
        where: { id: existing.courseId },
        select: { name: true },
      });
      try {
        await dispatch({
          event: 'tutor.expertise_deleted',
          userId: existing.tutorId,
          title: 'Your expertise was removed by an admin',
          message: `An administrator removed your expertise for ${course?.name ?? 'a course'}. If you believe this was an error, please contact support.`,
          actionUrl: '/tutor/expertise',
          type: 'WARNING',
          category: 'COURSE',
          priority: 'HIGH',
          actorUserId: (session.user as any).id,
          recipientRoleHint: 'TUTOR',
          metadata: { expertiseId: id, courseId: existing.courseId },
        });
      } catch (err) {
        console.error('Failed to notify tutor of expertise deletion:', err);
      }
    }

    revalidatePath('/admin/expertises');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to delete expertise.' };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Platform settings (commission + quotas)
// ──────────────────────────────────────────────────────────────────────────

const clampPercent = (label: string, v: number, min = 0, max = 100) => {
  if (Number.isNaN(v) || v < min || v > max) {
    return { error: `${label} must be between ${min} and ${max}.` };
  }
  return null;
};

export async function updatePlatformSettings(formData: FormData) {
  await requireAdmin();

  const withdrawalFeePercent = parseFloat(formData.get('withdrawalFeePercent') as string);
  const paymentFeePercent = parseFloat(formData.get('paymentFeePercent') as string);
  const promoDiscountPercent = parseFloat(formData.get('promoDiscountPercent') as string);
  const consultancyFreeQuota = parseInt(formData.get('consultancyFreeQuota') as string, 10);

  const err =
    clampPercent('Withdrawal fee', withdrawalFeePercent) ||
    clampPercent('Payment fee', paymentFeePercent) ||
    clampPercent('Promo discount', promoDiscountPercent);
  if (err) return err;
  if (Number.isNaN(consultancyFreeQuota) || consultancyFreeQuota < 0 || consultancyFreeQuota > 100) {
    return { error: 'Free quota must be a whole number between 0 and 100.' };
  }

  try {
    await prisma.platformSetting.upsert({
      where: { id: 'default' },
      update: {
        withdrawalFeePercent,
        paymentFeePercent,
        promoDiscountPercent,
        consultancyFreeQuota,
      },
      create: {
        id: 'default',
        withdrawalFeePercent,
        paymentFeePercent,
        promoDiscountPercent,
        consultancyFreeQuota,
      },
    });
    revalidatePath('/admin/settings');
    updateTag('platform-settings');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to update settings.' };
  }
}

export async function getAdminPlatformSettings() {
  await requireAdmin();
  const row = await prisma.platformSetting.findUnique({ where: { id: 'default' } });
  return row ?? { id: 'default', ...DEFAULT_SETTINGS, updatedAt: new Date() };
}

// ──────────────────────────────────────────────────────────────────────────
// Coupons
// ──────────────────────────────────────────────────────────────────────────

import { COUPON_SCOPES, type CouponScope } from '@/lib/coupon';

function parseCouponFormData(formData: FormData) {
  const code = ((formData.get('code') as string) || '').trim().toUpperCase();
  const scope = (formData.get('scope') as string) as CouponScope;
  const discountType = formData.get('discountType') as 'PERCENT' | 'FLAT';
  const value = parseFloat(formData.get('value') as string);
  const minAmount = parseFloat((formData.get('minAmount') as string) || '0') || 0;
  const maxDiscountRaw = formData.get('maxDiscount') as string;
  const maxDiscount = maxDiscountRaw ? parseFloat(maxDiscountRaw) : null;
  const usageLimitRaw = formData.get('usageLimit') as string;
  const usageLimit = usageLimitRaw ? parseInt(usageLimitRaw, 10) : null;
  const validUntilRaw = formData.get('validUntil') as string;
  const validUntil = validUntilRaw ? new Date(validUntilRaw) : null;
  const isActive = formData.get('isActive') === 'on';

  return { code, scope, discountType, value, minAmount, maxDiscount, usageLimit, validUntil, isActive };
}

function validateCoupon(parsed: ReturnType<typeof parseCouponFormData>): string | null {
  if (!parsed.code) return 'Coupon code is required.';
  if (!/^[A-Z0-9_-]{3,30}$/.test(parsed.code)) {
    return 'Code must be 3-30 chars, uppercase letters, digits, dash, or underscore.';
  }
  if (!COUPON_SCOPES.includes(parsed.scope)) return 'Invalid scope.';
  if (parsed.discountType !== 'PERCENT' && parsed.discountType !== 'FLAT') {
    return 'Invalid discount type.';
  }
  if (Number.isNaN(parsed.value) || parsed.value <= 0) return 'Value must be positive.';
  if (parsed.discountType === 'PERCENT' && parsed.value > 100) {
    return 'Percent value cannot exceed 100.';
  }
  if (parsed.minAmount < 0) return 'Minimum amount cannot be negative.';
  if (parsed.maxDiscount !== null && parsed.maxDiscount < 0) {
    return 'Max discount cannot be negative.';
  }
  if (parsed.usageLimit !== null && (Number.isNaN(parsed.usageLimit) || parsed.usageLimit < 1)) {
    return 'Usage limit must be a positive integer.';
  }
  return null;
}

export async function addCoupon(formData: FormData) {
  await requireAdmin();
  const parsed = parseCouponFormData(formData);
  const validationError = validateCoupon(parsed);
  if (validationError) return { error: validationError };

  try {
    await prisma.coupon.create({
      data: {
        code: parsed.code,
        scope: parsed.scope,
        discountType: parsed.discountType,
        value: parsed.value,
        minAmount: parsed.minAmount,
        maxDiscount: parsed.maxDiscount,
        usageLimit: parsed.usageLimit,
        validUntil: parsed.validUntil,
        isActive: parsed.isActive,
      },
    });
    revalidatePath('/admin/coupons');
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'P2002') return { error: 'Coupon code already exists.' };
    return { error: 'Failed to create coupon.' };
  }
}

export async function updateCoupon(formData: FormData) {
  await requireAdmin();
  const id = formData.get('id') as string;
  if (!id) return { error: 'ID is required.' };
  const parsed = parseCouponFormData(formData);
  const validationError = validateCoupon(parsed);
  if (validationError) return { error: validationError };

  try {
    await prisma.coupon.update({
      where: { id },
      data: {
        code: parsed.code,
        scope: parsed.scope,
        discountType: parsed.discountType,
        value: parsed.value,
        minAmount: parsed.minAmount,
        maxDiscount: parsed.maxDiscount,
        usageLimit: parsed.usageLimit,
        validUntil: parsed.validUntil,
        isActive: parsed.isActive,
      },
    });
    revalidatePath('/admin/coupons');
    return { success: true };
  } catch (err: any) {
    if (err?.code === 'P2002') return { error: 'Coupon code already exists.' };
    return { error: 'Failed to update coupon.' };
  }
}

export async function deleteCoupon(id: string) {
  await requireAdmin();
  try {
    await prisma.coupon.delete({ where: { id } });
    revalidatePath('/admin/coupons');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to delete coupon. It may have redemptions.' };
  }
}
