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
      </div>
    </div>
  );
}
