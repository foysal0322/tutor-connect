'use client';

import React, { useId } from 'react';

/**
 * Input primitive — single source of truth for text inputs.
 *
 * Replaces three competing patterns (.form-input, .input + .inputWithIcon,
 * FloatingInput placeholder-as-label) with one component that:
 *
 *   - Always renders a real <label htmlFor> (WCAG 1.3.1, 2.4.6, 3.3.2)
 *   - Wires error messaging via aria-describedby + aria-invalid (3.3.1, 3.3.3)
 *   - Shows a required indicator with aria-label when required (3.3.2)
 *   - Optional icon, hint, prefix/suffix slots
 *
 * Use this for new forms. Existing FloatingInput remains for the visual
 * floating-label aesthetic on auth screens, but it should be migrated over
 * time. See FRONTEND_AUDIT.md C3 / D1 / D2 / G2.
 */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string | null;
  hint?: string;
  /** Hide the visible label. Still rendered for screen readers. */
  visuallyHideLabel?: boolean;
  /** Render an icon inside the input, left-aligned. */
  leadingIcon?: React.ReactNode;
  /** Optional suffix (e.g. "BDT", "%"). */
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  visuallyHideLabel,
  leadingIcon,
  suffix,
  id: idProp,
  required,
  className,
  containerClassName,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const hasLeading = !!leadingIcon;

  return (
    <div className={containerClassName} style={{ marginBottom: 'var(--space-5)', position: 'relative' }}>
      <label
        htmlFor={id}
        style={
          visuallyHideLabel
            ? visuallyHiddenStyle
            : {
                display: 'block',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                marginBottom: 'var(--space-2)',
                color: 'var(--text-main)',
              }
        }
      >
        {label}
        {required && (
          <span aria-label="required" style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>
            *
          </span>
        )}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {hasLeading && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: 'var(--space-3)',
              display: 'inline-flex',
              alignItems: 'center',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          >
            {leadingIcon}
          </span>
        )}
        <input
          id={id}
          className={['form-input', className ?? ''].filter(Boolean).join(' ')}
          style={hasLeading ? { paddingLeft: '2.5rem' } : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          {...rest}
        />
        {suffix && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              right: 'var(--space-3)',
              color: 'var(--text-muted)',
              fontSize: 'var(--text-sm)',
              pointerEvents: 'none',
            }}
          >
            {suffix}
          </span>
        )}
      </div>

      {hint && !error && <div id={hintId} className="form-hint">{hint}</div>}
      {error && (
        <div id={errorId} role="alert" className="form-error">
          {error}
        </div>
      )}
    </div>
  );
}

const visuallyHiddenStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 0,
};
