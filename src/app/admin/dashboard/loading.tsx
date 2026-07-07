import SkeletonDashboardStats from '@/components/skeletons/SkeletonDashboardStats';

export default function AdminDashboardLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: '2rem', width: '14rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <SkeletonDashboardStats count={4} />
    </div>
  );
}
