import React from 'react';
import Spinner from '@/components/Spinner';
import s from './form-theme.module.css';

/**
 * The gradient submit button for themed forms (violet->blue, hover lift).
 * Replaces the global .btn-primary inside forms so the app's indigo
 * .btn-primary stays untouched. Renders a spinner + loadingText while
 * loading, mirroring the reference registration form.
 *
 * fullWidth defaults to true (block-level, like the reference form). Pass
 * fullWidth={false} for dashboard forms whose submit should size to content
 * or sit in a row alongside a Cancel button.
 */
interface FormSubmitProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  /** Optional leading icon (e.g. size 18 Lucide node). */
  icon?: React.ReactNode;
  /** Block-level full-width (default) vs. auto width. */
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function FormSubmit({
  loading = false,
  loadingText = 'Submitting...',
  icon,
  fullWidth = true,
  className,
  style,
  disabled,
  type = 'submit',
  children,
  ...rest
}: FormSubmitProps) {
  const mergedStyle = fullWidth ? style : { width: 'auto', ...style };
  const mergedClass = className ? `${s.submit} ${className}` : s.submit;
  return (
    <button
      type={type}
      className={mergedClass}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      style={mergedStyle}
      {...rest}
    >
      {loading ? (
        <>
          <Spinner size={18} /> {loadingText}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}
