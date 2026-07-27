import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How It Works — nsuOne',
  description:
    'A step-by-step guide to finding a tutor, booking a session, paying securely, and reviewing your tutor on nsuOne.',
  alternates: { canonical: '/tutorial' },
};

export default function TutorialPage() {
  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '800px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>How It Works</h1>
      
      <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
        <ol style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <li>
            <h3>1. Submit a Request</h3>
            <p>Students browse the available courses or search for a specific topic, then submit a detailed tutor request including their preferred mode and budget.</p>
          </li>
          <li>
            <h3>2. Admin Matching</h3>
            <p>Our admins review the request and match it with a qualified tutor who has the right expertise and availability.</p>
          </li>
          <li>
            <h3>3. Payment & Confirmation</h3>
            <p>Once a tutor accepts, the student makes the payment, and we connect both parties to begin the sessions.</p>
          </li>
          <li>
            <h3>4. Learn & Succeed</h3>
            <p>Attend your sessions and ace your course! Feedback ensures high quality.</p>
          </li>
        </ol>
      </div>
    </div>
  );
}
