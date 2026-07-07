import SkeletonTable from '@/components/skeletons/SkeletonTable';

export default function AdminSupportLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: '2rem', width: '10rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <div className="skeleton-card" style={{ padding: 0 }}>
        <SkeletonTable rows={8} columns={5} />
      </div>
    </div>
  );
}
