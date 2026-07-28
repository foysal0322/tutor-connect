import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { sendSupportEmail } from '@/lib/mail';
import { Mail, MessageSquare, User } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormSuccess,
  fieldClass,
} from '@/components/forms';

export const metadata: Metadata = {
  title: 'Contact Us — nsuOne',
  description:
    'Get in touch with the nsuOne team for support, partnership inquiries, or feedback. We typically respond within one business day.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const isSuccess = params.success === 'true';

  async function submitContact(formData: FormData) {
    'use server';
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const message = formData.get('message') as string;

    if (!name || !email || !message) {
      throw new Error('All fields are required');
    }

    // Send notification to support inbox
    try {
      await sendSupportEmail({
        to: 'support.nsuone@gmail.com',
        subject: `New Contact Inquiry from ${name}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">New Contact Us Inquiry</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p style="background: #f8fafc; padding: 12px; border-left: 4px solid #4f46e5; border-radius: 4px;"><em>"${message}"</em></p>
          </div>
        `,
        replyTo: email,
      });

      // Send auto-reply to user
      await sendSupportEmail({
        to: email,
        subject: `We received your message - NSUone Support`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">Thank you for contacting NSUone!</h2>
            <p>Hello ${name},</p>
            <p>We have received your message and our support team will get back to you as soon as possible.</p>
            <p style="background: #f8fafc; padding: 12px; border-left: 4px solid #4f46e5; border-radius: 4px;"><em>"${message}"</em></p>
            <p>If you need to add anything else, simply reply to this email.</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">NSUone Support Team</p>
          </div>
        `,
      });
    } catch (err) {
      console.error('Failed to send contact email:', err);
    }

    redirect('/contact?success=true');
  }

  return (
    <FormPage>
      <FormCard
        icon={<Mail size={28} />}
        title="Contact Us"
        subtitle="Have any questions? We're here to help!"
      >
        {isSuccess ? (
          <FormSuccess title="Message Sent!">
            Thank you for reaching out. We have sent a confirmation email to your inbox and our
            support team will get in touch with you shortly.
          </FormSuccess>
        ) : (
          <form action={submitContact} noValidate>
            <FormSection label="Your Details" icon={<User size={14} />}>
              <Input
                containerClassName={fieldClass}
                name="name"
                type="text"
                label="Name"
                placeholder="Your name"
                required
              />
              <Input
                containerClassName={fieldClass}
                name="email"
                type="email"
                label="Email"
                placeholder="you@example.com"
                required
              />
            </FormSection>

            <FormSection label="Message" icon={<MessageSquare size={14} />} columns={1}>
              <Textarea
                containerClassName={fieldClass}
                name="message"
                label="Message"
                required
                rows={4}
                placeholder="How can we help?"
              />
            </FormSection>

            <FormSubmit icon={<Mail size={18} />}>Send Message</FormSubmit>
          </form>
        )}
      </FormCard>
    </FormPage>
  );
}
