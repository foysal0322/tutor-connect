'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

export async function submitTutorRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    throw new Error('Not authorized');
  }

  const studentId = (session.user as any).id;
  const courseId = formData.get('courseId') as string;
  const topic = formData.get('topic') as string;
  const facultyName = formData.get('facultyName') as string;
  const preferredMode = formData.get('preferredMode') as string;
  const budget = parseFloat(formData.get('budget') as string);

  // Prevent duplicate pending requests for the same course
  const existing = await prisma.tutorRequest.findFirst({
    where: {
      studentId,
      courseId,
      status: 'PENDING'
    }
  });

  if (existing) {
    return { error: 'You already have a pending request for this course.' };
  }

  await prisma.tutorRequest.create({
    data: {
      studentId,
      courseId,
      topic,
      facultyName,
      preferredMode,
      budget
    }
  });

  // Fetch course name for the notification
  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (course) {
      const webhookUrl = 'REDACTED_WEBHOOK_URL';
      const studentName = session.user?.name || 'A student';
      const message = {
        embeds: [{
          title: '📚 New Tutor Request Submitted!',
          color: 5814783, // blurple
          fields: [
            { name: 'Student', value: studentName, inline: true },
            { name: 'Course', value: course.name, inline: true },
            { name: 'Topic', value: topic || 'General Help', inline: true },
            { name: 'Mode', value: preferredMode, inline: true },
            { name: 'Budget', value: `${budget} BDT`, inline: true }
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
    console.error('Failed to send discord notification', err);
  }

  const { revalidatePath } = await import('next/cache');
  revalidatePath('/student');
  return { success: true };
}

export async function cancelTutorRequest(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    throw new Error('Not authorized');
  }

  const studentId = (session.user as any).id;

  try {
    const existing = await prisma.tutorRequest.findFirst({
      where: { id, studentId },
      include: { course: true }
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

    // Send discord notification
    try {
      const webhookUrl = 'REDACTED_WEBHOOK_URL';
      const studentName = session.user?.name || 'A student';
      const message = {
        embeds: [{
          title: '❌ Tutor Request Cancelled',
          color: 15158332, // Red
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

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/student');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to cancel request.' };
  }
}
