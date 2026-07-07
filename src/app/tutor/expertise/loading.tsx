import SkeletonCard from '@/components/skeletons/SkeletonCard';

export default function TutorExpertiseLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: '2rem', width: '10rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={6} />
        ))}
      </div>
    </div>
  );
}
