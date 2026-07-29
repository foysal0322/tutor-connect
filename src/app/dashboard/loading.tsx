/**
 * Loading skeleton for /dashboard. Renders the dashboard shell so the
 * layout is stable while server Prisma queries resolve.
 */
import styles from './dashboard.module.css';

function shimmer(opacity: number = 1) {
  return {
    background: 'linear-gradient(90deg, #F1F5F9 0%, #E2E8F0 50%, #F1F5F9 100%)',
    borderRadius: 'var(--radius-md)',
    opacity,
  };
}

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 pb-12" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading your dashboard…</span>

      {/* Header skeleton */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ ...shimmer(0.7), width: 120, height: 24, marginBottom: 12 }} />
            <div style={{ ...shimmer(), width: 220, height: 28, marginBottom: 8 }} />
            <div style={{ ...shimmer(0.6), width: 280, height: 14 }} />
          </div>
          <div className={styles.headerActions}>
            <div style={{ ...shimmer(0.6), width: 140, height: 32, borderRadius: 999 }} />
            <div style={{ ...shimmer(0.6), width: 100, height: 32, borderRadius: 999 }} />
            <div style={{ ...shimmer(0.8), width: 130, height: 32, borderRadius: 999 }} />
          </div>
        </div>
      </div>

      {/* Tabs skeleton */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
        <div style={{ ...shimmer(0.7), width: 110, height: 36, borderRadius: 999 }} />
        <div style={{ ...shimmer(0.7), width: 110, height: 36, borderRadius: 999 }} />
      </div>

      {/* KPI skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.kpi}>
            <div className={styles.kpiHead}>
              <div style={{ ...shimmer(0.7), width: 80, height: 12 }} />
              <div style={{ ...shimmer(0.7), width: 32, height: 32, borderRadius: 8 }} />
            </div>
            <div style={{ ...shimmer(), width: 60, height: 28 }} />
            <div style={{ ...shimmer(0.6), width: 100, height: 10, marginTop: 8 }} />
          </div>
        ))}
      </div>

      {/* 2-col skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className={styles.section} style={{ minHeight: 260 }}>
          <div style={{ ...shimmer(0.7), width: 140, height: 18, marginBottom: 12 }} />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              style={{
                ...shimmer(0.6),
                width: '100%',
                height: 44,
                marginTop: 8,
              }}
            />
          ))}
        </div>
        <div className={styles.section} style={{ minHeight: 260 }}>
          <div style={{ ...shimmer(0.7), width: 160, height: 18, marginBottom: 12 }} />
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ ...shimmer(0.6), width: 120, height: 14 }} />
              <div style={{ ...shimmer(0.7), width: 60, height: 14 }} />
            </div>
          ))}
        </div>
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={styles.section} style={{ minHeight: 320 }}>
            <div style={{ ...shimmer(0.7), width: 140, height: 18, marginBottom: 8 }} />
            <div style={{ ...shimmer(0.6), width: 200, height: 12, marginBottom: 20 }} />
            <div style={{ ...shimmer(0.5), width: '100%', height: 220 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
