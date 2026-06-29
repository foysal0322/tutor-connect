'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function addTutorExpertise(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') {
    throw new Error('Not authorized');
  }

  const tutorId = (session.user as any).id;
  const courseId = formData.get('courseId') as string;
  const semesterCompleted = formData.get('semesterCompleted') as string;
  const facultyName = formData.get('facultyName') as string;
  const courseGrade = formData.get('courseGrade') as string;
  const availability = formData.get('availability') as string;
  const sessionFee = parseFloat(formData.get('sessionFee') as string);

  // Prevent duplicate expertise for the same course
  const existing = await prisma.tutorExpertise.findFirst({
    where: {
      tutorId,
      courseId
    }
  });

  if (existing) {
    return { error: 'You already added expertise for this course.' };
  }

  await prisma.tutorExpertise.create({
    data: {
      tutorId,
      courseId,
      semesterCompleted,
      facultyName,
      courseGrade,
      availability,
      sessionFee
    }
  });

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/tutor/expertise');
  return { success: true };
}

export async function updateTutorExpertise(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') throw new Error('Not authorized');

  const id = formData.get('id') as string;
  const tutorId = (session.user as any).id;
  const courseId = formData.get('courseId') as string;
  const semesterCompleted = formData.get('semesterCompleted') as string;
  const facultyName = formData.get('facultyName') as string;
  const courseGrade = formData.get('courseGrade') as string;
  const availability = formData.get('availability') as string;
  const sessionFee = parseFloat(formData.get('sessionFee') as string);

  try {
    const existing = await prisma.tutorExpertise.findFirst({
      where: { id, tutorId }
    });
    if (!existing) return { error: 'Expertise not found' };

    await prisma.tutorExpertise.update({
      where: { id },
      data: { courseId, semesterCompleted, facultyName, courseGrade, availability, sessionFee }
    });
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/tutor/expertise');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to update expertise' };
  }
}

export async function deleteTutorExpertise(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') throw new Error('Not authorized');
  const tutorId = (session.user as any).id;

  try {
    const existing = await prisma.tutorExpertise.findFirst({
      where: { id, tutorId }
    });
    if (!existing) return { error: 'Expertise not found' };

    await prisma.tutorExpertise.delete({ where: { id } });
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/tutor/expertise');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to delete expertise' };
  }
}

export async function toggleTutorExpertise(id: string, isActive: boolean) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'TUTOR') throw new Error('Not authorized');
  const tutorId = (session.user as any).id;

  try {
    const existing = await prisma.tutorExpertise.findFirst({
      where: { id, tutorId }
    });
    if (!existing) return { error: 'Expertise not found' };

    await prisma.tutorExpertise.update({
      where: { id },
      data: { isActive }
    });
    
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/tutor/expertise');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to toggle expertise' };
  }
}
