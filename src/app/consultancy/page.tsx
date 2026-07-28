import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, MessageSquareText, User } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { sendSupportEmail } from '@/lib/mail';
import styles from './consultancy.module.css';

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
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.iconBadge}>
              <MessageSquareText size={28} />
            </div>
            <div>
              <h1 className={styles.headerTitle}>Get Free Consultancy</h1>
              <p className={styles.headerSub}>
                Book a one-on-one session with a senior mentor for course selection,
                semester planning, or career guidance.
              </p>
            </div>
          </div>

          {isSuccess ? (
            <div className={styles.success}>
              <div className={styles.successBadge}>
                <CheckCircle2 size={36} />
              </div>
              <h2 className={styles.successTitle}>Request Submitted!</h2>
              <p className={styles.successText}>
                Thank you for reaching out. We&apos;ve sent a confirmation to your email
                and a mentor will contact you shortly.
              </p>
              <Link href="/" className={styles.homeLink}>
                Return to Home
              </Link>
            </div>
          ) : (
            <form action={submitConsultancy} noValidate>
              {/* Section: Identity */}
              <section className={styles.section}>
                <div className={styles.sectionLabel}>
                  <span className={styles.sectionIcon}>
                    <User size={14} />
                  </span>
                  <span className={styles.sectionText}>Your Identity</span>
                  <span className={styles.sectionRule} />
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="nsuId">
                    Your NSU ID
                  </label>
                  <input
                    id="nsuId"
                    name="nsuId"
                    type="text"
                    required
                    placeholder="e.g. 2211458642"
                    className={styles.input}
                  />
                </div>
              </section>

              {/* Section: Consultancy Details */}
              <section className={styles.section}>
                <div className={styles.sectionLabel}>
                  <span className={styles.sectionIcon}>
                    <MessageSquareText size={14} />
                  </span>
                  <span className={styles.sectionText}>Consultancy Details</span>
                  <span className={styles.sectionRule} />
                </div>

                <div className={styles.grid}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="topic">
                      Topic
                    </label>
                    <select id="topic" name="topic" required className={styles.select} defaultValue="">
                      <option value="" disabled>
                        Select a topic
                      </option>
                      <option value="Course Selection Advice">Course Selection Advice</option>
                      <option value="Semester Planning">Semester Planning</option>
                      <option value="Internship Guidance">Internship Guidance</option>
                      <option value="Career Advice">Career Advice</option>
                      <option value="Study Strategy">Study Strategy</option>
                    </select>
                  </div>

                  <div className={styles.field} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.label} htmlFor="details">
                      Additional Details
                    </label>
                    <textarea
                      id="details"
                      name="details"
                      required
                      rows={4}
                      placeholder="Briefly describe what you need help with..."
                      className={styles.textarea}
                    />
                  </div>
                </div>
              </section>

              <button type="submit" className={styles.submit}>
                <MessageSquareText size={18} /> Submit Request
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
