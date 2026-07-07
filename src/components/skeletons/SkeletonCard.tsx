/**
 * Reusable skeleton card component with shimmer animation.
 * Use for any card-based loading state.
 */
export default function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="skeleton-card">
      <div className="skeleton" style={{ height: '1.25rem', width: '60%', marginBottom: '1rem' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-text"
          style={{ width: i === lines - 1 ? '40%' : '100%' }}
        />
      ))}
    </div>
  );
}
