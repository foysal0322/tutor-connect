import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
}

/**
 * Button component with built-in loading state
 * @param loading - Shows loading spinner and disables button when true
 * @param loadingText - Text to display while loading (default: "Loading...")
 * @param variant - Button style variant
 * @param children - Button content (hidden during loading)
 */
export default function LoadingButton({
  loading = false,
  loadingText = 'Loading...',
  children,
  variant = 'primary',
  disabled,
  className = '',
  ...props
}: LoadingButtonProps) {
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    outline: 'btn-outline'
  };

  const baseClass = variantClasses[variant];

  return (
    <button
      className={`${baseClass} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <LoadingSpinner size="sm" color="currentColor" />
          {loadingText}
        </span>
      ) : (
        children
      )}
    </button>
  );
}