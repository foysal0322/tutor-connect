import SkeletonTable from '@/components/skeletons/SkeletonTable';

export default function TutorLoading() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton" style={{ height: '2rem', width: '12rem', marginBottom: '2rem', borderRadius: '8px' }} />
      <div className="skeleton" style={{ height: '1.5rem', width: '10rem', marginBottom: '1rem', borderRadius: '6px' }} />
      <div className="skeleton-card">
        <SkeletonTable rows={5} columns={6} />
      </div>
    </div>
  );
}
