import SkeletonCard from '@/components/skeletons/SkeletonCard';

export default function RequestTutorLoading() {
  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '0 1.5rem' }}>
      <div className="skeleton" style={{ height: '2rem', width: '14rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <SkeletonCard lines={8} />
    </div>
  );
}
