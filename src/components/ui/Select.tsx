'use client';

import React, { useId } from 'react';

/**
 * Native-styled Select primitive.
 *
 * Built on the native <select> for maximum accessibility (keyboard, screen
 * reader, mobile picker). Use <Combobox> for searchable dropdowns — do NOT
 * build another custom dropdown on divs.
 *
 * Wired for a11y out of the box:
 *   - <label htmlFor> properly associated
 *   - aria-invalid + aria-describedby when error is set
 *   - required indicator (*) when required
 *
 * See FRONTEND_AUDIT.md C7 / D1 / D2.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label: string;
  error?: string | null;
  hint?: string;
  options: SelectOption[];
  placeholderOption?: string;
  required?: boolean;
  containerClassName?: string;
}

export function Select({
  label,
  error,
  hint,
  options,
  placeholderOption,
  required,
  id: idProp,
  className,
  containerClassName,
  ...rest
}: SelectProps) {
  const generatedId = useId();
  const id = idProp ?? generatedId;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={containerClassName} style={{ marginBottom: 'var(--space-5)' }}>
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
        {label}
        {required && (
          <span aria-label="required" style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>
            *
          </span>
        )}
      </label>
      <select
        id={id}
        className={['form-select', className ?? ''].filter(Boolean).join(' ')}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        required={required}
        {...rest}
      >
        {placeholderOption && <option value="">{placeholderOption}</option>}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && !error && (
        <div id={hintId} className="form-hint">
          {hint}
        </div>
      )}
      {error && (
        <div id={errorId} role="alert" className="form-error">
          {error}
        </div>
      )}
    </div>
  );
}
