import SkeletonCard from '@/components/skeletons/SkeletonCard';

export default function StudentLoading() {
  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div className="skeleton" style={{ height: '2rem', width: '14rem', borderRadius: '8px' }} />
        <div className="skeleton" style={{ height: '2.5rem', width: '8rem', borderRadius: '12px' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} lines={5} />
        ))}
      </div>
    </div>
  );
}
