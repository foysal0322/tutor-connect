/**
 * Skeleton for the 4-column stat/KPI tiles used on dashboards across
 * the platform (admin + member).
 */
export default function SkeletonDashboardStats({ count = 4 }: { count?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="skeleton-card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div
            className="skeleton"
            style={{ height: '2.5rem', width: '4rem', borderRadius: '8px', margin: '0 auto 1rem' }}
          />
          <div
            className="skeleton"
            style={{ height: '0.9rem', width: '60%', margin: '0 auto' }}
          />
        </div>
      ))}
    </div>
  );
}
