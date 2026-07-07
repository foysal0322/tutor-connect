import SkeletonTable from '@/components/skeletons/SkeletonTable';

export default function AdminUsersLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: '2rem', width: '12rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <div className="skeleton-card" style={{ padding: 0 }}>
        <SkeletonTable rows={10} columns={7} />
      </div>
    </div>
  );
}
