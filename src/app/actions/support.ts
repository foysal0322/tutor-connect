'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function submitSupportTicket(formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const contact = formData.get('contact') as string;
  const type = formData.get('type') as string;
  const message = formData.get('message') as string;

  if (!name || !email || !type || !message || !contact) {
    return { error: 'All fields are required.' };
  }

  try {
    await prisma.supportTicket.create({
      data: { name, email, contact, type, message }
    });
    
    // Optional: send Discord notification for the support ticket
    try {
      const { notifySupportRequest } = await import('@/lib/discord');
      await notifySupportRequest({
        name,
        email,
        subject: type,
        message,
      });
    } catch (e) {
      console.error('Failed to send discord webhook for support ticket');
    }

    return { success: true };
  } catch (err: any) {
    return { error: 'An error occurred while submitting your request.' };
  }
}

export async function resolveSupportTicket(id: string) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  try {
    await prisma.supportTicket.update({
      where: { id },
      data: { status: 'RESOLVED' }
    });

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/support');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to resolve ticket.' };
  }
}
