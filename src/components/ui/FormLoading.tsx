import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import styles from './FormLoading.module.css';

interface FormLoadingProps {
  /** Primary line of copy. */
  title?: string;
  /** Secondary line of copy. */
  message?: string;
  /**
   * - `overlay` (default): absolutely fills the nearest positioned ancestor.
   * - `fixed`: fixed to the viewport — use for full-screen moments
   *   (e.g. between submit and route transition).
   * - `inline`: sits in normal flow, no backdrop.
   */
  variant?: 'overlay' | 'fixed' | 'inline';
  /** Override the spinner size. */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Reusable loading surface for submit / transition moments.
 *
 * Drop it inside any `position: relative` container with `variant="overlay"`
 * to dim the form while a server action runs, or use `variant="fixed"` for a
 * full-viewport moment between submit and the next route.
 */
export default function FormLoading({
  title,
  message = 'Processing...',
  variant = 'overlay',
  size = 'lg',
}: FormLoadingProps) {
  const rootClass =
    variant === 'inline'
      ? styles.inline
      : variant === 'fixed'
        ? styles.fixed
        : styles.overlay;

  return (
    <div className={rootClass} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.content}>
        <LoadingSpinner size={size} color="var(--primary)" />
        {title && <p className={styles.title}>{title}</p>}
        <p className={styles.message}>{message}</p>
      </div>
    </div>
  );
}
