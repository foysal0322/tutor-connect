import React, { useState } from 'react';
import styles from './RetryButton.module.css';

interface RetryButtonProps {
  onRetry: () => Promise<void> | void;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline';
  retryText?: string;
  loadingText?: string;
  className?: string;
}

/**
 * Button component with built-in retry logic and loading state
 * @param onRetry - Function to call when retrying (can be async)
 * @param children - Button content (default: "Try Again")
 * @param variant - Button style variant
 * @param retryText - Text to display for retry button
 * @param loadingText - Text to display during retry
 * @param className - Additional CSS classes
 */
export default function RetryButton({
  onRetry,
  children = 'Try Again',
  variant = 'primary',
  retryText = 'Try Again',
  loadingText = 'Retrying...',
  className = ''
}: RetryButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await onRetry();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retry failed');
      // Keep error visible for 3 seconds then clear it
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  const variantClasses = {
    primary: styles.primary,
    secondary: styles.secondary,
    outline: styles.outline
  };

  return (
    <div className={styles.container}>
      <button
        className={`${variantClasses[variant]} ${styles.button} ${isLoading ? styles.loading : ''} ${className}`}
        onClick={handleClick}
        disabled={isLoading}
        aria-label={isLoading ? loadingText : retryText}
        aria-busy={isLoading}
      >
        {isLoading ? (
          <span className={styles.loadingContent}>
            <svg
              className={styles.spinner}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {loadingText}
          </span>
        ) : (
          children
        )}
      </button>
      {error && (
        <div className={styles.errorMessage} role="alert" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  );
}