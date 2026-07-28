import React from 'react';
import s from './form-theme.module.css';

/**
 * The themed card surface + header for a form.
 *
 * surface="glass" (default) — translucent blurred card for standalone forms
 *   rendered inside a <FormPage>.
 * surface="embedded" — solid white card for forms embedded in dashboard
 *   pages (no translucency, reads correctly on opaque backgrounds).
 */
interface FormCardProps {
  /** Lucide icon node rendered inside the gradient badge (e.g. size 28). */
  icon: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Footer row beneath the form body (sign-in links, etc.). */
  footer?: React.ReactNode;
  surface?: 'glass' | 'embedded';
  className?: string;
  children: React.ReactNode;
}

export function FormCard({
  icon,
  title,
  subtitle,
  footer,
  surface = 'glass',
  className,
  children,
}: FormCardProps) {
  const cardClass = surface === 'embedded' ? s.cardEmbedded : s.card;
  return (
    <div className={className ? `${cardClass} ${className}` : cardClass}>
      <div className={s.header}>
        <div className={s.iconBadge}>{icon}</div>
        <div>
          <h1 className={s.headerTitle}>{title}</h1>
          {subtitle && <p className={s.headerSub}>{subtitle}</p>}
        </div>
      </div>
      {children}
      {footer && <div className={s.footer}>{footer}</div>}
    </div>
  );
}
