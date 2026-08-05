'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendSupportEmail } from '@/lib/mail';
import { notifyAdmins } from '@/lib/notifications/admin';
import { dispatch } from '@/lib/notifications/service';

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

    // Phase 5: in-app admin notification (additive — Discord + email above are unchanged).
    // Best-effort: never abort the ticket submission if this fails.
    try {
      await notifyAdmins({
        event: 'support.submitted',
        title: 'New Support Ticket',
        message: `${name} (${email}) — ${type}: "${message.slice(0, 140)}".`,
        actionUrl: '/admin/support',
        type: 'INFO',
        category: 'SUPPORT',
        priority: 'MEDIUM',
        metadata: { ticketEmail: email, ticketType: type },
      });
    } catch (e) {
      console.error('Failed to notify admins of support ticket:', e);
    }

    // Phase 7: in-app receipt to the submitter if they have an NSUone
    // account. The contact form is open to guests, so email is the primary
    // channel; this in-app row is a bonus for authenticated users.
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, role: true },
      });
      if (user) {
        await dispatch({
          event: 'support.submitted_receipt',
          userId: user.id,
          title: 'Support Ticket Received',
          message: `We received your support ticket regarding "${type}". Our team will get back to you soon.`,
          actionUrl: '/contact',
          type: 'INFO',
          category: 'SUPPORT',
          priority: 'LOW',
          recipientRoleHint: user.role === 'TUTOR' ? 'TUTOR' : 'STUDENT',
          metadata: { ticketType: type, ticketEmail: email },
        });
      }
    } catch (err) {
      console.error('Failed to send in-app support receipt:', err);
    }

    try {
      await sendSupportEmail({
        to: email,
        subject: `Support Request Received: ${type} - NSUone`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">We Received Your Support Request!</h2>
            <p>Hello ${name},</p>
            <p>Thank you for reaching out to NSUone Support regarding <strong>${type}</strong>.</p>
            <p style="background: #f8fafc; padding: 12px; border-left: 4px solid #4f46e5; border-radius: 4px;"><em>"${message}"</em></p>
            <p>Our support team is reviewing your ticket and will get back to you soon. If you need to add any additional information or have questions, feel free to reply directly to this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">NSUone Support Team</p>
          </div>
        `
      });
    } catch (mailErr) {
      console.error('Failed to send support confirmation email:', mailErr);
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
    const ticket = await prisma.supportTicket.findUnique({
      where: { id }
    });

    await prisma.supportTicket.update({
      where: { id },
      data: { status: 'RESOLVED' }
    });

    if (ticket) {
      try {
        await sendSupportEmail({
          to: ticket.email,
          subject: `Support Ticket Resolved: ${ticket.type} - NSUone`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #10b981;">Support Ticket Resolved</h2>
              <p>Hello ${ticket.name},</p>
              <p>Your support ticket regarding <strong>${ticket.type}</strong> has been marked as <strong>RESOLVED</strong> by our team.</p>
              <p>If you feel your issue is not completely resolved or if you have any further questions, simply reply directly to this email and we will be glad to assist you further!</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="color: #64748b; font-size: 0.9em;">NSUone Support Team</p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('Failed to send ticket resolution email:', mailErr);
      }

      // Phase 7: in-app notification to the ticket submitter if they have an
      // NSUone account. SupportTicket has no userId column — we resolve by
      // email. If no matching user, the email above is the only channel.
      try {
        const user = await prisma.user.findUnique({
          where: { email: ticket.email },
          select: { id: true, role: true },
        });
        if (user) {
          await dispatch({
            event: 'support.resolved',
            userId: user.id,
            title: 'Support Ticket Resolved',
            message: `Your support ticket regarding "${ticket.type}" has been marked resolved. Reply to our email if you need more help.`,
            actionUrl: '/contact',
            type: 'INFO',
            category: 'SUPPORT',
            priority: 'MEDIUM',
            actorUserId: (session.user as any).id,
            recipientRoleHint: user.role === 'TUTOR' ? 'TUTOR' : 'STUDENT',
            metadata: { ticketId: ticket.id, ticketType: ticket.type },
          });
        }
      } catch (err) {
        console.error('Failed to send in-app support resolution:', err);
      }
    }

    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/support');
    return { success: true };
  } catch (err: any) {
    return { error: 'Failed to resolve ticket.' };
  }
}

