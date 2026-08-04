import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy · nsuOne',
  description: 'nsuOne privacy policy.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="card" style={{ padding: '2.5rem' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.875rem',
            marginBottom: '1.5rem',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 52,
              height: 52,
              borderRadius: 14,
              background:
                'linear-gradient(135deg, var(--primary, #7c3aed), var(--primary-2, #2563eb))',
              color: '#ffffff',
              boxShadow: '0 10px 30px rgba(124, 58, 237, 0.25)',
            }}
          >
            <ShieldCheck size={26} aria-hidden="true" />
          </span>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              Privacy Policy
            </h1>
            <p className="text-muted" style={{ margin: 0 }}>
              Last updated: August 4, 2026
            </p>
          </div>
        </div>

        <div
          className="alert"
          style={{
            background: 'rgba(37, 99, 235, 0.08)',
            border: '1px solid rgba(37, 99, 235, 0.25)',
            borderLeft: '4px solid var(--primary-2, #2563eb)',
            color: '#1e3a8a',
            borderRadius: 12,
            padding: '1rem 1.1rem',
            marginBottom: '1.75rem',
            fontSize: '0.92rem',
          }}
        >
          <strong>Heads up —</strong> Our full privacy policy is being finalised
          with our legal advisor and will be published here soon. In the
          meantime, here is a short summary of how nsuOne handles your data.
        </div>

        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              What we collect
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Your name, NSU ID, email, contact number, gender, and department —
              only what is required to match you with tutors or students on
              campus.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              How we use it
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Your information is used solely to run the nsuOne marketplace:
              matching, payments, withdrawals, and account support. We never
              sell your data.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Wallet &amp; payments
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Wallet balances, transactions, and withdrawal details are stored
              securely and used only for the services you initiate on nsuOne.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Questions?
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Reach us anytime at{' '}
              <a
                href="mailto:support@nsuone.edu"
                style={{ color: 'var(--primary, #7c3aed)', fontWeight: 600 }}
              >
                support@nsuone.edu
              </a>{' '}
              — the full policy will replace this page shortly.
            </p>
          </section>
        </div>

        <div
          style={{
            marginTop: '2rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '12px 24px',
              borderRadius: 12,
              background:
                'linear-gradient(135deg, var(--primary, #7c3aed), var(--primary-2, #2563eb))',
              color: '#ffffff',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 8px 20px rgba(124, 58, 237, 0.22)',
            }}
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
