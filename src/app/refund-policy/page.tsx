import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy — nsuOne',
  description:
    'nsuOne refund policy: eligibility, processing windows, and how to request a refund for tutoring sessions and wallet recharges.',
  alternates: { canonical: '/refund-policy' },
};

export default function RefundPolicyPage() {
  return (
    <div className="container animate-fade-in" style={{ padding: '4rem 1.5rem', maxWidth: '800px' }}>
      <h1 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>Refund Policy</h1>
      
      <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
        <p style={{ marginBottom: '1rem' }}>
          At nsuOne, we strive to provide the best tutoring experience. However, we understand that issues may arise.
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>Eligibility for Refund</h3>
        <ul style={{ paddingLeft: '1.5rem', marginBottom: '1rem' }}>
          <li>The tutor did not show up for the scheduled session.</li>
          <li>The session quality was severely lacking, subject to admin review.</li>
          <li>The session was cancelled before it began.</li>
        </ul>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>How to Request</h3>
        <p>
          Students must submit a refund request through their dashboard within 24 hours of the scheduled session time. Admins will review the case and process the refund if approved.
        </p>

        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>How Refunds Are Paid</h3>
        <p>
          Approved refunds are credited to your <strong>nsuOne campus wallet</strong>, not returned to the original payment method (bKash/Nagad/Rocket). The session fee is refunded in full; the 5% platform service fee is retained. Wallet funds can be used immediately for new sessions or future payments.
        </p>
      </div>
    </div>
  );
}
