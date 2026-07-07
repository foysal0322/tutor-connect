import SkeletonCard from '@/components/skeletons/SkeletonCard';

export default function ConsultancyLoading() {
  return (
    <div style={{ maxWidth: '600px', margin: '4rem auto', padding: '0 1.5rem' }}>
      <div className="skeleton" style={{ height: '2.5rem', width: '70%', marginBottom: '1rem', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '1rem', width: '90%', marginBottom: '2rem', borderRadius: '6px' }} />
      <SkeletonCard lines={6} />
    </div>
  );
}
