import React from 'react';
import s from './form-theme.module.css';

/**
 * Full-viewport centered wrapper for STANDALONE forms (auth, contact,
 * consultancy, etc.). Renders the pastel gradient page background plus the
 * grid texture, and centers a single child (usually a <FormCard>).
 *
 * Do NOT use this for forms embedded inside dashboard pages — those render
 * inside the dashboard shell and should use <FormCard surface="embedded">
 * directly.
 */
interface FormPageProps {
  children: React.ReactNode;
  /** narrow = 480px (sign-in), default = 820px (register/contact), wide = 960px. */
  maxWidth?: 'narrow' | 'default' | 'wide';
  className?: string;
}

export function FormPage({ children, maxWidth = 'default', className }: FormPageProps) {
  const inner =
    maxWidth === 'narrow' ? s.innerNarrow : maxWidth === 'wide' ? s.innerWide : s.inner;
  return (
    <div className={s.page}>
      <div className={className ? `${inner} ${className}` : inner}>{children}</div>
    </div>
  );
}
