import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import styles from './FormLoading.module.css';

interface FormLoadingProps {
  message?: string;
  overlay?: boolean;
}

/**
 * Form loading indicator component
 * @param message - Custom loading message
 * @param overlay - Whether to display as overlay (default: true)
 */
export default function FormLoading({
  message = 'Processing...',
  overlay = true
}: FormLoadingProps) {
  if (overlay) {
    return (
      <div
        className={styles.overlay}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div className={styles.content}>
          <LoadingSpinner size="lg" color="var(--primary)" />
          <p className={styles.message}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={styles.inline}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <LoadingSpinner size="md" color="var(--primary)" />
      <span className={styles.message}>{message}</span>
    </div>
  );
}