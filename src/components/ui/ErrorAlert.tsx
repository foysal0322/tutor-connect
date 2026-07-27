import React from 'react';
import styles from './ErrorAlert.module.css';

export type ErrorType = 'error' | 'warning' | 'info' | 'success';

interface ErrorAlertProps {
  type?: ErrorType;
  title?: string;
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Standardized error alert component with consistent styling and behavior
 * @param type - Error severity type
 * @param title - Optional title/header
 * @param message - Error message to display
 * @param dismissible - Whether user can dismiss the alert
 * @param onDismiss - Callback when dismissed
 * @param actions - Optional action buttons
 */
export default function ErrorAlert({
  type = 'error',
  title,
  message,
  dismissible = true,
  onDismiss,
  actions,
  className = ''
}: ErrorAlertProps) {
  const typeConfig = {
    error: {
      icon: '✕',
      className: styles.error,
      title: title || 'Error'
    },
    warning: {
      icon: '⚠',
      className: styles.warning,
      title: title || 'Warning'
    },
    info: {
      icon: 'ℹ',
      className: styles.info,
      title: title || 'Information'
    },
    success: {
      icon: '✓',
      className: styles.success,
      title: title || 'Success'
    }
  };

  const config = typeConfig[type];

  return (
    <div
      className={`${styles.alert} ${config.className} ${className}`}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className={styles.content}>
        <span className={styles.icon} aria-hidden="true">
          {config.icon}
        </span>
        <div className={styles.messageContainer}>
          {title && <h4 className={styles.title}>{config.title}</h4>}
          <p className={styles.message}>{message}</p>
          {actions && <div className={styles.actions}>{actions}</div>}
        </div>
        {dismissible && onDismiss && (
          <button
            className={styles.dismissButton}
            onClick={onDismiss}
            aria-label="Dismiss alert"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}