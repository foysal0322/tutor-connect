import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { MessageSquareText, LogIn, CheckCircle2, IdCard, Tags } from 'lucide-react';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth';
import { sendSupportEmail } from '@/lib/mail';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  fieldClass,
  gridFullClass,
} from '@/components/forms';
import ConsultancySuccessToast from './ConsultancySuccessToast';

/** Each student is allowed at most this many free consultancy sessions. */
const MAX_FREE_CONSULTANCY = 2;

export const metadata: Metadata = {
  title: 'Academic Consultancy — nsuOne',
  description:
    'Book a one-on-one academic consultancy session with experienced NSU seniors and tutors for course selection, career guidance, and study planning.',
  alternates: { canonical: '/consultancy' },
};

export default async function ConsultancyPage() {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; nsuId?: string; name?: string | null } | undefined;

  // Precompute usage so the UI can show remaining slots (guests default to 2/2).
  const usedCount = sessionUser?.id
    ? await prisma.consultancyRequest.count({
        where: { studentId: sessionUser.id },
      })
    : 0;
  const remaining = Math.max(0, MAX_FREE_CONSULTANCY - usedCount);

  async function submitConsultancy(formData: FormData) {
    'use server';

    const submittingSession = await getServerSession(authOptions);
    const user = submittingSession?.user as { id?: string } | undefined;
    if (!user?.id) {
      // Not logged in — bounce to sign-in, then back here.
      redirect('/auth/signin?callbackUrl=/consultancy');
    }

    const student = await prisma.user.findUnique({
      where: { id: user.id },
      select: { id: true, name: true, nsuId: true, email: true },
    });

    if (!student) {
      throw new Error('Account not found. Please register first.');
    }

    // Enforce the free-quota cap.
    const existing = await prisma.consultancyRequest.count({
      where: { studentId: student.id },
    });
    if (existing >= MAX_FREE_CONSULTANCY) {
      throw new Error(
        `You have already used your ${MAX_FREE_CONSULTANCY} free consultancy sessions.`,
      );
    }

    const topic = formData.get('topic') as string;
    const details = formData.get('details') as string;

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

  // -------- Guest state: gate behind login --------
  if (!sessionUser?.id) {
    return (
      <FormPage>
        <FormCard
          icon={<MessageSquareText size={28} />}
          title="Get Free Consultancy"
          subtitle="Book a one-on-one session with a senior mentor for course selection, semester planning, or career guidance."
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '2rem 1rem',
              textAlign: 'center',
            }}
          >
            <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>
              Please log in first to claim your {MAX_FREE_CONSULTANCY} free consultancy sessions.
            </p>
            <Link
              href={`/auth/signin?callbackUrl=${encodeURIComponent('/consultancy')}`}
              className="btn-primary"
            >
              <LogIn size={18} /> Login to get free consultancy
            </Link>
          </div>
        </FormCard>
      </FormPage>
    );
  }

  const quotaBadgeStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    alignSelf: 'flex-start',
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    fontSize: '0.85rem',
    fontWeight: 600,
    background:
      remaining > 0 ? 'rgba(79, 70, 229, 0.1)' : 'rgba(239, 68, 68, 0.1)',
    color: remaining > 0 ? 'var(--primary)' : 'var(--danger)',
  };

  // -------- Quota exhausted --------
  if (remaining === 0) {
    return (
      <FormPage>
        <FormCard
          icon={<MessageSquareText size={28} />}
          title="Free Consultancy Quota Used"
          subtitle="You've used all your complimentary consultancy sessions."
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1rem',
              padding: '2rem 1rem',
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={40} style={{ color: 'var(--primary)' }} />
            <p style={{ color: 'var(--text-muted, #64748b)', margin: 0 }}>
              You&apos;ve used all {MAX_FREE_CONSULTANCY} of your free consultancy sessions.
              Our team will reach out about your pending requests.
            </p>
          </div>
        </FormCard>
      </FormPage>
    );
  }

  // -------- Logged in with remaining slots --------
  return (
    <FormPage>
      <FormCard
        icon={<MessageSquareText size={28} />}
        title="Get Free Consultancy"
        subtitle="Book a one-on-one session with a senior mentor for course selection, semester planning, or career guidance."
      >
        <ConsultancySuccessToast />
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <span style={quotaBadgeStyle}>
            <MessageSquareText size={14} />
            {remaining} of {MAX_FREE_CONSULTANCY} free sessions remaining
          </span>
        </div>
        <form action={submitConsultancy} noValidate>
          {/* Identity field (pre-filled, read-only) — title omitted per client request */}
          <FormSection columns={1}>
            <Input
              containerClassName={fieldClass}
              name="nsuId"
              type="text"
              label="Your NSU ID"
              labelIcon={<IdCard size={14} />}
              defaultValue={sessionUser.nsuId}
              readOnly
              required
            />
          </FormSection>

          {/* Consultancy details — title omitted per client request */}
          <FormSection>
            <Select
              containerClassName={fieldClass}
              name="topic"
              label="Topic"
              labelIcon={<Tags size={14} />}
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
              labelIcon={<MessageSquareText size={14} />}
              required
              rows={4}
              placeholder="Briefly describe what you need help with..."
            />
          </FormSection>

          <FormSubmit icon={<MessageSquareText size={18} />}>Submit Request</FormSubmit>
        </form>
      </FormCard>
    </FormPage>
  );
}
