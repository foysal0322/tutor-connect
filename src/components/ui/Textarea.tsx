'use client';

import React, { useId } from 'react';

/**
 * Textarea primitive — same a11y contract as <Input>: label, error wiring,
 * required indicator, hint. See FRONTEND_AUDIT.md C3 / D1 / D2.
 */

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string | null;
  hint?: string;
  /** Small decorative icon shown at the start of the label text (aria-hidden). */
  labelIcon?: React.ReactNode;
  containerClassName?: string;
}

export function Textarea({
  label,
  error,
  hint,
  labelIcon,
  id: idProp,
  required,
  className,
  containerClassName,
  ...rest
}: TextareaProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          marginBottom: 'var(--space-2)',
          color: 'var(--text-main)',
        }}
      >
        {labelIcon && (
          <span aria-hidden="true" style={labelIconStyle}>
            {labelIcon}
          </span>
        )}
        {label}
        {required && (
          <span aria-label="required" style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>
            *
          </span>
        )}
      </label>
      <textarea
        id={id}
        className={['form-textarea', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        {...rest}
      />
      {hint && !error && <div id={hintId} className="form-hint">{hint}</div>}
      {error && (
        <div id={errorId} role="alert" className="form-error">
          {error}
        </div>
      )}
    </div>
  );
}

/** Inline decorative icon placed at the start of a field label. */
const labelIconStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  marginRight: '0.4rem',
  verticalAlign: '-0.18em',
  color: 'var(--form-accent, var(--primary, #7c3aed))',
};
