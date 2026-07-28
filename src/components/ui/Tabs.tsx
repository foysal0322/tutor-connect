'use client';

import { useState } from 'react';
import styles from './Tabs.module.css';

export type TabItem = {
  id: string;
  label: string;
  /** Weight used to pick the default active tab — the highest count wins. */
  count?: number;
};

/**
 * Generic accessible tabs component.
 *
 * The default active tab is the one with the highest `count` (priority by
 * activity). This lets the dashboard surface whichever role — learning or
 * teaching — the member is most active in, while still letting them switch.
 */
export default function Tabs({
  tabs,
  panels,
}: {
  tabs: TabItem[];
  panels: Record<string, React.ReactNode>;
}) {
  if (tabs.length === 0) return null;

  const initial = tabs.reduce((top, t) => ((t.count ?? 0) > (top.count ?? 0) ? t : top), tabs[0]);
  const [active, setActive] = useState(initial.id);

  return (
    <div className={styles.wrap}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              className={`${styles.tab} ${selected ? styles.tabActive : ''}`}
              onClick={() => setActive(t.id)}
            >
              <span>{t.label}</span>
              {typeof t.count === 'number' && (
                <span className={`${styles.badge} ${selected ? styles.badgeActive : ''}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div
          key={t.id}
          id={`panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${t.id}`}
          hidden={t.id !== active}
          className={styles.panel}
        >
          {panels[t.id]}
        </div>
      ))}
    </div>
  );
}
