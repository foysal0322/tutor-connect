import { Star, Users, CheckCircle2, TrendingUp } from 'lucide-react';
import styles from '../dashboard.module.css';

export interface PerformanceData {
  /** 0-100 — completed / terminal states */
  completionRate: number | null;
  /** Average rating across reviewed sessions, 0-5 */
  averageRating: number | null;
  ratingCount: number;
  /** Distinct students ever taught */
  uniqueStudents: number;
  /** Distinct students currently active (ACCEPTED) */
  activeStudents: number;
}

function StarRow({ value }: { value: number }) {
  const rounded = Math.round(value);
  return (
    <span className={styles.stars} aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <Star
          key={i}
          size={14}
          fill={i < rounded ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export default function PerformanceSummary({ data }: { data: PerformanceData }) {
  const { completionRate, averageRating, ratingCount, uniqueStudents, activeStudents } = data;

  return (
    <section className={styles.section} aria-labelledby="perf-title">
      <div className={styles.sectionHead}>
        <h3 id="perf-title" className={styles.sectionTitle}>
          <TrendingUp size={16} className="text-primary" />
          Performance Summary
        </h3>
        <p className={styles.sectionSubtitle}>
          How students move through your teaching funnel.
        </p>
      </div>

      <div>
        <div className={styles.perfRow}>
          <span className={styles.perfLabel}>
            <CheckCircle2 size={14} className="text-success" />
            Completion Rate
          </span>
          <span className={styles.perfValue}>
            {completionRate === null ? '—' : `${completionRate}%`}
          </span>
        </div>

        <div className={styles.perfRow}>
          <span className={styles.perfLabel}>
            <Star size={14} className="text-accent" />
            Average Rating
          </span>
          <span className={styles.perfValue} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {averageRating === null ? (
              'No ratings yet'
            ) : (
              <>
                {averageRating.toFixed(1)}
                <StarRow value={averageRating} />
                <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.75rem' }}>
                  ({ratingCount})
                </span>
              </>
            )}
          </span>
        </div>

        <div className={styles.perfRow}>
          <span className={styles.perfLabel}>
            <Users size={14} className="text-info" />
            Unique Students Taught
          </span>
          <span className={styles.perfValue}>{uniqueStudents}</span>
        </div>

        <div className={styles.perfRow}>
          <span className={styles.perfLabel}>
            <Users size={14} className="text-primary" />
            Currently Active
          </span>
          <span className={styles.perfValue}>{activeStudents}</span>
        </div>
      </div>
    </section>
  );
}
