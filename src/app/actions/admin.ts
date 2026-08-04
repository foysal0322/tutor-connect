'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath, updateTag } from 'next/cache';
import { createNotification } from '@/lib/notification';
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
    await prisma.user.update({
      where: { id: userId },
      data: { isBlocked: block }
    });
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
      await createNotification(
        userId,
        isCredit ? 'Wallet Credited' : 'Wallet Debited',
        `${amount} BDT has been ${verb} your wallet — ${reason}`,
        '/wallet',
      );
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
  await requireAdmin();
  if (!['PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED'].includes(status)) {
    return { error: 'Invalid status.' };
  }
  try {
    await prisma.consultancyRequest.update({ where: { id }, data: { status } });
    revalidatePath('/admin/consultancy');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to update request status.' };
  }
}
