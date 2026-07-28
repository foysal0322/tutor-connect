import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { sendSupportEmail } from '@/lib/mail';

export const metadata: Metadata = {
  title: 'Contact Us — nsuOne',
  description:
    'Get in touch with the nsuOne team for support, partnership inquiries, or feedback. We typically respond within one business day.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
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
        `
      });
    } catch (err) {
      console.error('Failed to send contact email:', err);
    }

    redirect('/contact?success=true');
  }

  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '600px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '1.5rem', textAlign: 'center' }}>Contact Us</h1>
      
      <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
        {isSuccess ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ width: '60px', height: '60px', background: 'var(--success-light)', color: 'var(--success-hover)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.75rem' }}>✓</div>
            <h2 style={{ color: 'var(--success-hover)', marginBottom: '0.5rem' }}>Message Sent!</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Thank you for reaching out. We have sent a confirmation email to your inbox and our support team will get in touch with you shortly.</p>
            <a href="/" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>Return to Home</a>
          </div>
        ) : (
          <>
            <p style={{ marginBottom: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              Have any questions? We're here to help!
            </p>

            <form action={submitContact} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Name</label>
                <input name="name" type="text" required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Email</label>
                <input name="email" type="email" required className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Message</label>
                <textarea name="message" required rows={4} className="form-input" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}></textarea>
              </div>
              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>Send Message</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

