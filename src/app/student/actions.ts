'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

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
  const budget = parseFloat(formData.get('budget') as string);
  const tutorId = formData.get('tutorId') as string || null;
  const status = tutorId ? 'MATCHED' : 'PENDING';

  // Prevent duplicate requests for the same course
  const existing = await prisma.tutorRequest.findFirst({
    where: {
      studentId,
      courseId,
      status: status
    }
  });

  if (existing) {
    return { error: `You already have a ${status.toLowerCase()} request for this course.` };
  }

  await prisma.tutorRequest.create({
    data: {
      studentId,
      courseId,
      topic,
      facultyName,
      preferredMode,
      budget,
      assignedTutorId: tutorId,
      status
    }
  });

  // Fetch course name for the notification
  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (course) {
      const webhookUrl = 'https://discord.com/api/webhooks/1351086319815888916/GkSxw4XAuJDCeshqZ95GBLYiwwgk7VCv3LFL7qDsPBIqXebwBshikJd8HcJm-9OT0H6B';
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
    return { error: 'Not authorized.' };
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
      const webhookUrl = 'https://discord.com/api/webhooks/1351086319815888916/GkSxw4XAuJDCeshqZ95GBLYiwwgk7VCv3LFL7qDsPBIqXebwBshikJd8HcJm-9OT0H6B';
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

export async function submitPayment(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    return { error: 'Not authorized.' };
  }

  const requestId = formData.get('requestId') as string;
  const mfsType = formData.get('mfsType') as string;
  const accountNumber = formData.get('accountNumber') as string;
  const amount = parseFloat(formData.get('amount') as string);
  const transactionId = formData.get('transactionId') as string;

  if (!requestId || !mfsType || !accountNumber || isNaN(amount) || !transactionId) {
    return { error: 'All fields are required.' };
  }

  try {
    await prisma.payment.upsert({
      where: { requestId },
      update: {
        mfsType,
        accountNumber,
        amount,
        transactionId
      },
      create: {
        requestId,
        mfsType,
        accountNumber,
        amount,
        transactionId
      }
    });

    await prisma.tutorRequest.update({
      where: { id: requestId },
      data: { status: 'PAYMENT_PENDING' }
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/student');
    return { success: true };
  } catch (err) {
    console.error('Submit payment error:', err);
    return { error: 'Failed to submit payment details.' };
  }
}

export async function completeTutorRequest(requestId: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'STUDENT') {
    return { error: 'Not authorized.' };
  }

  try {
    await prisma.tutorRequest.update({
      where: { id: requestId },
      data: { status: 'COMPLETED' }
    });

    const { revalidatePath } = await import('next/cache');
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

  if (!requestId || !details) {
    return { error: 'Details/Reason is required.' };
  }

  try {
    // Check if there is already a refund request
    const existing = await prisma.refundRequest.findFirst({
      where: { requestId }
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

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/student');
    return { success: true };
  } catch (err) {
    console.error('Refund request error:', err);
    return { error: 'Failed to submit refund request.' };
  }
}
