import SkeletonDashboardStats from '@/components/skeletons/SkeletonDashboardStats';

/**
 * Loading skeleton for /tutor/expertise.
 * Mirrors the real layout (header + 4 stat cards + toolbar + list) so the
 * transition into the page causes no visible layout shift.
 */
export default function TutorExpertiseLoading() {
  return (
    <div className="max-w-full animate-fade-in">
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <div
          className="skeleton"
          style={{ height: '2rem', width: '12rem', marginBottom: 'var(--space-3)', borderRadius: 'var(--radius-sm)' }}
        />
        <div
          className="skeleton"
          style={{ height: '0.9rem', width: '26rem', maxWidth: '100%', borderRadius: 'var(--radius-sm)' }}
        />
      </div>

      {/* Stat cards */}
      <div style={{ marginBottom: 'var(--space-8)' }}>
        <SkeletonDashboardStats count={4} />
      </div>

      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <div
          className="skeleton"
          style={{ height: '2.75rem', flex: 1, borderRadius: 'var(--radius-md)' }}
        />
        <div
          className="skeleton"
          style={{ height: '2.75rem', width: '9rem', borderRadius: 'var(--radius-md)' }}
        />
      </div>

      {/* Expertise cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div style={{ flex: 1 }}>
                <div
                  className="skeleton"
                  style={{ height: '1.1rem', width: '14rem', marginBottom: 'var(--space-2)', borderRadius: 'var(--radius-sm)' }}
                />
                <div
                  className="skeleton"
                  style={{ height: '0.85rem', width: '10rem', borderRadius: 'var(--radius-sm)' }}
                />
              </div>
              <div
                className="skeleton"
                style={{ height: '1.5rem', width: '2.75rem', borderRadius: 'var(--radius-full)' }}
              />
            </div>
            <div
              className="skeleton"
              style={{ height: '4.5rem', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
              <div className="skeleton" style={{ height: '2rem', width: '5rem', borderRadius: 'var(--radius-md)' }} />
              <div className="skeleton" style={{ height: '2rem', width: '5rem', borderRadius: 'var(--radius-md)' }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
