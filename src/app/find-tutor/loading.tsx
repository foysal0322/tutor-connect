import SkeletonTutorCard from '@/components/skeletons/SkeletonTutorCard';

export default function FindTutorLoading() {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 1.5rem' }}>
      {/* Header skeleton */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div className="skeleton" style={{ height: '2.5rem', width: '16rem', margin: '0 auto 1rem', borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '1rem', width: '24rem', margin: '0 auto', borderRadius: '6px' }} />
      </div>

      {/* Filter bar skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton" style={{ height: '0.875rem', width: '6rem', marginBottom: '0.5rem', borderRadius: '4px' }} />
            <div className="skeleton" style={{ height: '2.75rem', borderRadius: '8px' }} />
          </div>
        ))}
      </div>

      {/* Tutor cards grid skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonTutorCard key={i} />
        ))}
      </div>
    </div>
  );
}
