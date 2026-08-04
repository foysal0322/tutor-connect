import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

export const metadata = {
  title: 'Consultancy Policy · nsuOne',
  description: 'nsuOne consultancy policy — sessions, quotas, refunds, and conduct.',
};

export default function ConsultancyPolicyPage() {
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
            <MessageSquareText size={26} aria-hidden="true" />
          </span>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
              Consultancy Policy
            </h1>
            <p className="text-muted" style={{ margin: 0 }}>
              Last updated: August 4, 2026
            </p>
          </div>
        </div>

        <div className="stack" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              What is nsuOne Consultancy?
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              One-on-one academic sessions with verified NSU seniors and tutors
              for course selection, semester planning, internship guidance, and
              career advice. Sessions are booked through the platform and
              delivered online or on campus at a mutually agreed time.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Free quota
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Every NSU student receives a limited number of complimentary
              consultancy sessions on free topics. Free sessions are subject to
              availability and may be exhausted once the quota is reached.
              Premium (paid) topics are not counted against the free quota.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Paid sessions &amp; pricing
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Premium consultancy topics carry a price set by nsuOne. Payment is
              debited from your Campus Wallet at the time of booking and held
              until the session is marked completed. Any applicable taxes or
              platform fees are included in the displayed price.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Rescheduling &amp; cancellation
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              You may reschedule or cancel a booked session up to 12 hours
              before the agreed time at no charge. Later cancellations are
              non-refundable. If a mentor cancels, you will receive a full
              refund to your Campus Wallet within 48 hours.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Conduct
            </h2>
            <p className="text-muted" style={{ lineHeight: 1.6 }}>
              Sessions are confidential. Sharing recorded content, harassing
              mentors or other students, or attempting to bypass payment will
              result in account suspension and forfeiture of any pending
              sessions.
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
              </a>
              .
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
