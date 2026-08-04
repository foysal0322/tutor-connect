/**
 * Loading skeleton for /wallet.
 * Mirrors the real layout (header → balance hero → KPI row → two-column
 * deposit + history) so the page-in transition causes no layout shift.
 */
export default function WalletLoading() {
  return (
    <div className="w-full max-w-5xl mx-auto py-2 animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* Header */}
      <div>
        <div className="skeleton" style={{ height: '2rem', width: '12rem', marginBottom: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }} />
        <div className="skeleton" style={{ height: '0.9rem', width: '24rem', maxWidth: '100%', borderRadius: 'var(--radius-sm)' }} />
      </div>

      {/* Balance hero */}
      <div
        className="skeleton"
        style={{ height: '7.5rem', borderRadius: 'var(--radius-lg)', borderTop: '4px solid var(--primary)' }}
      />

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)' }}>
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 'var(--space-5)' }}>
            <div className="skeleton" style={{ height: '0.75rem', width: '50%', marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }} />
            <div className="skeleton" style={{ height: '1.5rem', width: '70%', borderRadius: 'var(--radius-sm)' }} />
          </div>
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div className="skeleton" style={{ height: '1.25rem', width: '10rem', marginBottom: 'var(--space-5)', borderRadius: 'var(--radius-sm)' }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '2.75rem', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)' }} />
          ))}
        </div>
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <div className="skeleton" style={{ height: '1.25rem', width: '9rem', marginBottom: 'var(--space-5)', borderRadius: 'var(--radius-sm)' }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '3rem', marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}
