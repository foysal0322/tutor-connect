import Link from 'next/link';
import { AlertCircle, EyeOff, UserCircle2, Wallet, ArrowRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import styles from '../dashboard.module.css';

export interface ActionItem {
  id: string;
  text: string;
  count?: number;
  href: string;
  icon: LucideIcon;
  iconTone: 'primary' | 'accent' | 'info' | 'success';
}

const toneClass: Record<ActionItem['iconTone'], string> = {
  primary: 'var(--primary-light)',
  accent: 'var(--accent-light)',
  info: 'var(--info-light)',
  success: 'var(--success-light)',
};

const toneColor: Record<ActionItem['iconTone'], string> = {
  primary: 'var(--primary)',
  accent: 'var(--accent-hover)',
  info: 'var(--info-hover)',
  success: 'var(--success-hover)',
};

export default function ActionCenter({ items }: { items: ActionItem[] }) {
  return (
    <section className={styles.section} aria-labelledby="action-center-title">
      <div className={styles.sectionHead}>
        <h3 id="action-center-title" className={styles.sectionTitle}>
          <AlertCircle size={16} className="text-primary" />
          Action Center
        </h3>
        <p className={styles.sectionSubtitle}>
          Tasks that move your teaching forward — prioritized by impact.
        </p>
      </div>

      {items.length === 0 ? (
        <div className={styles.actionEmpty}>
          You&apos;re all caught up. Nothing needs your attention right now.
        </div>
      ) : (
        <ul className={styles.actionList}>
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <Link href={item.href} className={styles.actionItem}>
                  <span className={styles.actionLead}>
                    <span
                      className={styles.actionIcon}
                      style={{
                        background: toneClass[item.iconTone],
                        color: toneColor[item.iconTone],
                      }}
                    >
                      <Icon size={16} />
                    </span>
                    <span className={styles.actionText}>{item.text}</span>
                  </span>
                  {typeof item.count === 'number' && (
                    <span className={styles.actionCount}>{item.count}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export { ArrowRight, EyeOff, UserCircle2, Wallet };
