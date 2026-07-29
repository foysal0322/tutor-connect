import { formatDistanceToNow } from 'date-fns';
import { Star, UserPlus, BookPlus, Wallet, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from '../dashboard.module.css';

export interface ActivityEntry {
  id: string;
  kind: 'review' | 'student' | 'expertise' | 'withdrawal' | 'request';
  title: string;
  meta?: string;
  at: Date;
}

const kindMeta: Record<
  ActivityEntry['kind'],
  { icon: LucideIcon; bg: string; color: string }
> = {
  review:      { icon: Star,        bg: 'var(--accent-light)',  color: 'var(--accent-hover)' },
  student:     { icon: UserPlus,    bg: 'var(--primary-light)', color: 'var(--primary)' },
  expertise:   { icon: BookPlus,    bg: 'var(--success-light)', color: 'var(--success-hover)' },
  withdrawal:  { icon: Wallet,      bg: 'var(--info-light)',    color: 'var(--info-hover)' },
  request:     { icon: MessageSquare, bg: 'var(--bg-color)',    color: 'var(--text-muted)' },
};

export default function RecentActivity({
  entries,
}: {
  entries: ActivityEntry[];
}) {
  return (
    <section className={styles.section} aria-labelledby="activity-title">
      <div className={styles.sectionHead}>
        <h3 id="activity-title" className={styles.sectionTitle}>
          Recent Activity
        </h3>
        <p className={styles.sectionSubtitle}>
          Your last few teaching moments, newest first.
        </p>
      </div>

      {entries.length === 0 ? (
        <div className={styles.actionEmpty}>
          No activity yet. Once students request you or leave reviews, they&apos;ll appear here.
        </div>
      ) : (
        <ul className={styles.feed}>
          {entries.map((e) => {
            const { icon: Icon, bg, color } = kindMeta[e.kind];
            return (
              <li key={`${e.kind}-${e.id}`} className={styles.feedItem}>
                <span
                  className={styles.feedIcon}
                  style={{ background: bg, color }}
                >
                  <Icon size={16} />
                </span>
                <div className={styles.feedBody}>
                  <p className={styles.feedTitle}>{e.title}</p>
                  {e.meta && <p className={styles.feedMeta}>{e.meta}</p>}
                </div>
                <time
                  className={styles.feedMeta}
                  dateTime={e.at.toISOString()}
                  style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  {formatDistanceToNow(e.at, { addSuffix: true })}
                </time>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
