import React from 'react';
import styles from './PageLoading.module.css';

/**
 * Full-page loading component with skeleton content
 * Provides visual feedback during page-level data fetching
 */
export default function PageLoading() {
  return (
    <div className={styles.container} aria-live="polite" aria-busy="true">
      <div className={styles.header}>
        <div className={`${styles.skeleton} ${styles.title}`} />
        <div className={`${styles.skeleton} ${styles.subtitle}`} />
      </div>

      <div className={styles.content}>
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className={`${styles.skeleton} ${styles.cardHeader}`} />
              <div className={`${styles.skeleton} ${styles.cardText}`} />
              <div className={`${styles.skeleton} ${styles.cardTextShort}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}