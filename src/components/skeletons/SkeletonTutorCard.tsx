/**
 * Skeleton for tutor listing cards on the Find Tutor page.
 */
export default function SkeletonTutorCard() {
  return (
    <div className="skeleton-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div className="skeleton" style={{ height: '1.25rem', width: '55%', marginBottom: '0.5rem' }} />
          <div className="skeleton" style={{ height: '0.9rem', width: '40%' }} />
        </div>
        <div className="skeleton" style={{ height: '1.5rem', width: '4rem', borderRadius: '50px' }} />
      </div>

      {/* Course name */}
      <div className="skeleton" style={{ height: '1rem', width: '70%', borderRadius: '6px' }} />

      {/* Detail rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="skeleton" style={{ height: '0.85rem', width: '35%' }} />
          <div className="skeleton" style={{ height: '0.85rem', width: '30%' }} />
        </div>
      ))}

      {/* Button */}
      <div className="skeleton" style={{ height: '2.5rem', width: '100%', borderRadius: '8px', marginTop: '0.5rem' }} />
    </div>
  );
}
