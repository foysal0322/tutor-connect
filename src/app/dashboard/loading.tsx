/**
 * Loading skeleton for /dashboard. Shown while the shell data (lightweight
 * counts) resolves. Once the shell paints, each panel's own <Suspense>
 * fallback (PanelSkeleton) takes over for the heavier data fetch.
 *
 * Uses the global `.skeleton` / `.skeleton-card` classes so the shimmer is
 * token-driven and dark-mode safe (the previous inline hex values were not).
 */
import styles from './dashboard.module.css';

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-5 pb-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>

      {/* Header skeleton — matches DashboardContent's header shape */}
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ minWidth: 0 }}>
            <div className="skeleton" style={{ width: 220, height: 28, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: 180, height: 14 }} />
          </div>
          <div className={styles.headerActions}>
            <div className="skeleton" style={{ width: 130, height: 32, borderRadius: 999 }} />
            <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 999 }} />
          </div>
        </div>
      </header>

      {/* Tabs skeleton */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="skeleton" style={{ width: 110, height: 36, borderRadius: 999 }} />
        <div className="skeleton" style={{ width: 110, height: 36, borderRadius: 999 }} />
      </div>

      {/* KPI tiles skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton-card" style={{ padding: '1rem 1.25rem' }}>
            <div
              className="skeleton"
              style={{ height: '0.7rem', width: '60%', marginBottom: '0.75rem' }}
            />
            <div className="skeleton" style={{ height: '1.75rem', width: '40%' }} />
          </div>
        ))}
      </div>

      {/* Two-column section skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="skeleton-card"
            style={{ padding: '1.25rem', minHeight: 240 }}
          >
            <div
              className="skeleton"
              style={{ height: '1rem', width: '50%', marginBottom: '1rem' }}
            />
            {Array.from({ length: 4 }).map((_, j) => (
              <div
                key={j}
                className="skeleton"
                style={{
                  height: 40,
                  width: '100%',
                  marginTop: 8,
                }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
