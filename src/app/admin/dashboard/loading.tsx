import React from 'react';
import styles from './admin-dashboard.module.css';

function Bar({ w, h }: { w: number | string; h: number }) {
  return <div className="skeleton rounded" style={{ width: w, height: h }} />;
}

// Skeleton mirrors the refactored admin dashboard layout (header, KPI grid,
// metric tiles, charts) using the shared module classes so the loading state
// matches the real layout footprint. Inline sizes avoid the missing w-/h-
// utility classes this Tailwind-less project doesn't define.
export default function AdminDashboardLoading() {
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLead}>
          <span className={`${styles.headerIcon} skeleton`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
            <Bar w={260} h={26} />
            <Bar w={360} h={14} />
          </div>
        </div>
        <div className={styles.headerMeta}>
          <Bar w={168} h={26} />
          <Bar w={132} h={26} />
        </div>
      </div>

      {/* KPI cards */}
      <div className={styles.kpiGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.kpi}>
            <div className={styles.kpiHead}>
              <div className={styles.kpiLabelBlock}>
                <Bar w={104} h={12} />
                <div style={{ height: 8 }} />
                <Bar w={64} h={26} />
              </div>
              <span className={`${styles.kpiIcon} skeleton`} />
            </div>
            <Bar w="100%" h={12} />
          </div>
        ))}
      </div>

      {/* Metric tiles */}
      <div className={styles.metricGrid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.metricTile}>
            <span className={`${styles.metricTileIcon} skeleton`} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
              <Bar w={110} h={12} />
              <Bar w={150} h={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className={styles.chartGrid}>
        <div className={styles.chartCard}>
          <Bar w={200} h={18} />
          <div className="skeleton rounded" style={{ width: '100%', height: 300 }} />
        </div>
        <div className={styles.chartCard}>
          <Bar w={180} h={18} />
          <div className="skeleton rounded" style={{ width: '100%', height: 220 }} />
        </div>
      </div>
    </div>
  );
}
