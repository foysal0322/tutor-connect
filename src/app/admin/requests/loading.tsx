import SkeletonTable from '@/components/skeletons/SkeletonTable';

export default function AdminRequestsLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: '2rem', width: '18rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <div className="skeleton-card" style={{ padding: 0, overflow: 'hidden' }}>
        {/* Toolbar skeleton */}
        <div style={{ display: 'flex', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div className="skeleton" style={{ flex: 1, height: '2.75rem', borderRadius: '8px' }} />
          <div className="skeleton" style={{ width: '10rem', height: '2.75rem', borderRadius: '8px' }} />
        </div>
        <SkeletonTable rows={8} columns={5} />
      </div>
    </div>
  );
}
