'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';

export async function updateUserProfile(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error('Not authenticated');

  const userId = (session.user as any).id;
  const role = (session.user as any).role;

  const name = formData.get('name') as string;
  const nsuId = formData.get('nsuId') as string;
  const email = formData.get('email') as string;
  const contact = formData.get('contact') as string;
  const gender = formData.get('gender') as string;
  const departmentId = formData.get('departmentId') as string;
  
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;
  
  const updateData: any = { name, nsuId, email, contact, gender };
  
  if (departmentId) {
    updateData.departmentId = departmentId;
  }

  // CGPA is editable for every member (the profile-completion KPI counts it
  // for students too). An empty field clears the stored value.
  if (role === 'STUDENT' || role === 'TUTOR') {
    const cgpa = formData.get('cgpa');
    updateData.cgpa = cgpa ? parseFloat(cgpa as string) : null;
    updateData.hideCgpa = formData.get('hideCgpa') === 'on';
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
    return { error: 'Failed to update profile.' };
  }

  // The profile page lives at /profile (legacy role routes just redirect
  // there) — revalidate the real path so the completion KPI refreshes.
  // /dashboard renders the same 5-field heuristic, so refresh it too.
  revalidatePath('/profile');
  revalidatePath('/dashboard');
  return { success: true };
}

/**
 * Returns the course ids the current user teaches (their TutorExpertise rows).
 * Used client-side to disable "request tutoring" for a course they already
 * teach — the authoritative guard lives in submitTutorRequest; this is the
 * matching UI affordance. Returns an empty list for guests/students.
 */
export async function getMyTaughtCourseIds(): Promise<string[]> {
  const session = await getServerSession(authOptions);
  if (!session) return [];
  const userId = (session.user as any).id;
  const rows = await prisma.tutorExpertise.findMany({
    where: { tutorId: userId },
    select: { courseId: true },
  });
  return rows.map((r) => r.courseId);
}
