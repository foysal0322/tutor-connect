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
      const webhookUrl = 'https://discord.com/api/webhooks/1351086319815888916/GkSxw4XAuJDCeshqZ95GBLYiwwgk7VCv3LFL7qDsPBIqXebwBshikJd8HcJm-9OT0H6B';
      const embed = {
        embeds: [{
          title: `📬 New ${type} Submitted!`,
          color: type === 'REFUND' ? 15158332 : (type === 'COMPLAINT' ? 15548997 : 5763719),
          fields: [
            { name: 'Name', value: name, inline: true },
            { name: 'Email', value: email, inline: true },
            { name: 'Contact', value: contact, inline: true },
            { name: 'Type', value: type, inline: true },
            { name: 'Message', value: message }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(embed)
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
