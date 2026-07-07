import SkeletonTable from '@/components/skeletons/SkeletonTable';

export default function AdminPasswordResetsLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: '2rem', width: '14rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <div className="skeleton-card" style={{ padding: 0 }}>
        <SkeletonTable rows={6} columns={4} />
      </div>
    </div>
  );
}
