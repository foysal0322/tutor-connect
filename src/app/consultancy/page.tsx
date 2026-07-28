import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { MessageSquareText, User } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { sendSupportEmail } from '@/lib/mail';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormSuccess,
  fieldClass,
  gridFullClass,
} from '@/components/forms';

export const metadata: Metadata = {
  title: 'Academic Consultancy — nsuOne',
  description:
    'Book a one-on-one academic consultancy session with experienced NSU seniors and tutors for course selection, career guidance, and study planning.',
  alternates: { canonical: '/consultancy' },
};

export default async function ConsultancyPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const isSuccess = params.success === 'true';

  async function submitConsultancy(formData: FormData) {
    'use server';

    // For MVP, we will lookup the user by their NSU ID
    const nsuId = formData.get('nsuId') as string;
    const topic = formData.get('topic') as string;
    const details = formData.get('details') as string;

    const student = await prisma.user.findUnique({
      where: { nsuId },
    });

    if (!student) {
      throw new Error('Student with this NSU ID not found. Please register first.');
    }

    await prisma.consultancyRequest.create({
      data: {
        studentId: student.id,
        topic,
        details,
      },
    });

    try {
      const { notifyConsultancyRequest } = await import('@/lib/discord');
      await notifyConsultancyRequest({
        studentName: student.name,
        topic,
      });
    } catch (err) {
      console.error('Failed to send consultancy discord notification', err);
    }

    try {
      await sendSupportEmail({
        to: student.email,
        subject: `Consultancy Request Confirmed: ${topic} - NSUone`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #4f46e5;">We Received Your Consultancy Request!</h2>
            <p>Hello ${student.name},</p>
            <p>We have received your request for a free consultation session on <strong>${topic}</strong>.</p>
            <p style="background: #f8fafc; padding: 12px; border-left: 4px solid #4f46e5; border-radius: 4px;"><em>"${details}"</em></p>
            <p>One of our senior mentors will review your request and contact you shortly via email or phone. If you have any questions before the session, reply directly to this email!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 0.9em;">NSUone Mentorship & Consultancy Team</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error('Failed to send consultancy confirmation email:', mailErr);
    }

    redirect('/consultancy?success=true');
  }

  return (
    <FormPage>
      <FormCard
        icon={<MessageSquareText size={28} />}
        title="Get Free Consultancy"
        subtitle="Book a one-on-one session with a senior mentor for course selection, semester planning, or career guidance."
      >
        {isSuccess ? (
          <FormSuccess title="Request Submitted!">
            Thank you for reaching out. We&apos;ve sent a confirmation to your email and a mentor
            will contact you shortly.
          </FormSuccess>
        ) : (
          <form action={submitConsultancy} noValidate>
            {/* Section: Identity */}
            <FormSection label="Your Identity" icon={<User size={14} />} columns={1}>
              <Input
                containerClassName={fieldClass}
                name="nsuId"
                type="text"
                label="Your NSU ID"
                placeholder="e.g. 2211458642"
                required
              />
            </FormSection>

            {/* Section: Consultancy Details */}
            <FormSection label="Consultancy Details" icon={<MessageSquareText size={14} />}>
              <Select
                containerClassName={fieldClass}
                name="topic"
                label="Topic"
                required
                placeholderOption="Select a topic"
                options={[
                  { value: 'Course Selection Advice', label: 'Course Selection Advice' },
                  { value: 'Semester Planning', label: 'Semester Planning' },
                  { value: 'Internship Guidance', label: 'Internship Guidance' },
                  { value: 'Career Advice', label: 'Career Advice' },
                  { value: 'Study Strategy', label: 'Study Strategy' },
                ]}
              />
              <Textarea
                containerClassName={`${fieldClass} ${gridFullClass}`}
                name="details"
                label="Additional Details"
                required
                rows={4}
                placeholder="Briefly describe what you need help with..."
              />
            </FormSection>

            <FormSubmit icon={<MessageSquareText size={18} />}>Submit Request</FormSubmit>
          </form>
        )}
      </FormCard>
    </FormPage>
  );
}
