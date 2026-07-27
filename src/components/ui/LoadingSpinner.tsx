import React from 'react';
import styles from './LoadingSpinner.module.css';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

/**
 * Reusable loading spinner component with multiple sizes
 * @param size - Size variant: 'sm' (16px), 'md' (24px), 'lg' (32px)
 * @param color - Custom color (CSS color value)
 * @param className - Additional CSS classes
 */
export default function LoadingSpinner({
  size = 'md',
  color = 'currentColor',
  className = ''
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: '16px',
    md: '24px',
    lg: '32px'
  };

  return (
    <svg
      className={`${styles.spinner} ${className}`}
      width={sizeMap[size]}
      height={sizeMap[size]}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      role="status"
    >
      <circle
        className={styles.circle}
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="4"
        strokeDasharray="32"
        strokeDashoffset="32"
      />
    </svg>
  );
}