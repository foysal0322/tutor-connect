"use client";

import { useEffect, useState } from "react";
import styles from "./Tabs.module.css";

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
 *
 * Optional `onSelect` is fired whenever the active tab changes, including
 * the initial mount (with whatever id the count heuristic picked). This
 * lets parents (e.g. <DashboardContent>) sync side effects like the
 * member-focus hint without owning tab state themselves.
 */
export default function Tabs({
  tabs,
  panels,
  onSelect,
}: {
  tabs: TabItem[];
  panels: Record<string, React.ReactNode>;
  /** Called with the active tab id on initial mount and on every change. */
  onSelect?: (id: string) => void;
}) {
  const [active, setActive] = useState(() => {
    if (tabs.length === 0) return "";
    return tabs.reduce(
      (top, t) => ((t.count ?? 0) > (top.count ?? 0) ? t : top),
      tabs[0],
    ).id;
  });

  // Notify parent of the active tab: once on mount, then on every change.
  useEffect(() => {
    if (onSelect && active) onSelect(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  if (tabs.length === 0) return null;

  return (
    <div className={styles.wrap}>
      <div className={styles.tabList} role='tablist'>
        {tabs.map((t) => {
          const selected = t.id === active;
          return (
            <button
              key={t.id}
              type='button'
              role='tab'
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              className={`${styles.tab} ${selected ? styles.tabActive : ""}`}
              onClick={() => setActive(t.id)}
            >
              <span>{t.label}</span>
              {typeof t.count === "number" && (
                <span
                  className={`${styles.badge} ${selected ? styles.badgeActive : ""}`}
                >
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
          role='tabpanel'
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
