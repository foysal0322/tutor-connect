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
 * Spacing: this component does NOT impose vertical margins. The parent is
 * responsible for spacing (e.g. Tailwind `space-y-*` or `flex flex-col gap-*`
 * on the form, or `gap-*` on a grid).
 *
 * See FRONTEND_AUDIT.md C3 / D1 / D2 / G2.
 */

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label: string;
  error?: string | null;
  hint?: string;
  /** Hide the visible label. Still rendered for screen readers. */
  visuallyHideLabel?: boolean;
  /** Small decorative icon shown at the start of the label text (aria-hidden). */
  labelIcon?: React.ReactNode;
  /** Render an icon inside the input, left-aligned. */
  leadingIcon?: React.ReactNode;
  /** Optional decorative suffix (e.g. "BDT", "%"). Not interactive. */
  suffix?: React.ReactNode;
  /** Optional interactive trailing element (e.g. password visibility toggle). */
  trailingIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Input({
  label,
  error,
  hint,
  visuallyHideLabel,
  labelIcon,
  leadingIcon,
  suffix,
  trailingIcon,
  id: idProp,
  required,
  className,
  containerClassName,
  type,
  onWheel,
  ...rest
}: InputProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  const hasLeading = !!leadingIcon;
  const hasTrailing = !!trailingIcon;

  return (
    <div className={containerClassName} style={{ position: 'relative' }}>
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
        {labelIcon && <span aria-hidden="true" style={labelIconStyle}>{labelIcon}</span>}
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
          type={type}
          className={['form-input', className ?? ''].filter(Boolean).join(' ')}
          style={{
            ...(hasLeading ? { paddingLeft: '2.5rem' } : null),
            ...(hasTrailing ? { paddingRight: '2.5rem' } : null),
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          required={required}
          onWheel={(e) => {
            // Number inputs otherwise mutate their value when the user scrolls
            // inside the field — silently bumping budget/amount/CGPA. Blur so
            // the wheel scrolls the page instead. Callers can still handle onWheel.
            if (type === 'number') {
              (e.target as HTMLInputElement).blur();
            }
            onWheel?.(e);
          }}
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
        {trailingIcon && (
          <span
            style={{
              position: 'absolute',
              right: 'var(--space-2)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {trailingIcon}
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

/** Inline decorative icon placed at the start of a field label. */
const labelIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: '0.4rem',
  verticalAlign: '-0.18em',
  color: 'var(--form-accent, var(--primary, #7c3aed))',
};
