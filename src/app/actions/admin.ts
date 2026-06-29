'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

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
