import SkeletonDashboardStats from '@/components/skeletons/SkeletonDashboardStats';

/**
 * Lightweight per-panel fallback shown inside the Learning / Teaching
 * <Suspense> boundaries while the panel's async server component resolves.
 *
 * Reuses the existing stat-tile skeleton so the shimmer vocabulary stays
 * consistent with the rest of the app.
 */
export default function PanelSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading panel…</span>
      <SkeletonDashboardStats count={4} />
    </div>
  );
}
