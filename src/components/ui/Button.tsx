'use client';

import React from 'react';

/**
 * Button primitive — single source of truth for button styling.
 * Replaces ad-hoc .btn / .btn-primary / inline styles across the app.
 *
 * Variants:
 *   primary   — indigo, white text, default for affirmative actions
 *   secondary — white surface with border, for neutral actions
 *   outline   — transparent with primary border, for tertiary actions
 *   ghost     — transparent, no border, for icon-bar-style actions
 *   danger    — red, for destructive actions
 *
 * Sizes:
 *   sm md lg
 *
 * All variants get focus-visible rings, disabled state, and aria-busy
 * support out of the box.
 *
 * See FRONTEND_AUDIT.md C7.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** When true, renders a spinner + sets aria-busy. Disables the button. */
  loading?: boolean;
  /** Render as full width. */
  fullWidth?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  outline: 'btn-outline',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btn-sm',
  md: '',
  lg: 'btn-lg',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    className,
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  const classes = [
    'btn',
    VARIANT_CLASS[variant],
    SIZE_CLASS[size],
    fullWidth ? 'btn-block' : '',
    loading ? 'btn-loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      ref={ref}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && (
        <span className="btn-spinner" aria-hidden="true">
          <span className="sr-only">Loading</span>
        </span>
      )}
      {children}
    </button>
  );
});
