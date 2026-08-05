import SkeletonCard from '@/components/skeletons/SkeletonCard';

export default function AdminProfileLoading() {
  return (
    <div className='animate-fade-in' aria-busy='true'>
      <div
        className='skeleton'
        style={{ height: '2rem', width: '10rem', marginBottom: '2rem', borderRadius: '8px' }}
      />
      <div className='skeleton-card' style={{ padding: '1.5rem' }}>
        <SkeletonCard lines={4} />
        <div style={{ height: '1.5rem' }} />
        <SkeletonCard lines={4} />
        <div style={{ height: '1.5rem' }} />
        <SkeletonCard lines={2} />
      </div>
    </div>
  );
}
