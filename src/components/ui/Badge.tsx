import React from 'react';

/**
 * Badge primitive — single source of truth for status pill styling.
 *
 * Use <StatusBadge> for domain-specific statuses (PAYMENT_PENDING, etc.).
 * Use this <Badge> for generic categorical labels.
 *
 * See FRONTEND_AUDIT.md C7 / E7.
 */

export type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const TONE_CLASS: Record<BadgeTone, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
};

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  const classes = ['badge', TONE_CLASS[tone], className ?? ''].filter(Boolean).join(' ');
  return (
    <span className={classes} {...rest}>
      {children}
    </span>
  );
}
