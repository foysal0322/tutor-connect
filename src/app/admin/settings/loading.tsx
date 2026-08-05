import SkeletonCard from '@/components/skeletons/SkeletonCard';

export default function AdminSettingsLoading() {
  return (
    <div className='animate-fade-in' aria-busy='true'>
      <div
        className='skeleton'
        style={{ height: '2rem', width: '8rem', marginBottom: '0.75rem', borderRadius: '8px' }}
      />
      <div
        className='skeleton'
        style={{ height: '1rem', width: '24rem', marginBottom: '2rem', borderRadius: '8px' }}
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
