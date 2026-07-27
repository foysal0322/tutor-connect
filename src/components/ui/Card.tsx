import React from 'react';

/**
 * Card primitive — single source of truth for card padding, radius, shadow,
 * and border. Use this instead of `.card` + ad-hoc inline styles.
 *
 * Variants:
 *   default  — flat surface with light border and small shadow
 *   elevated — larger shadow, used for hero/feature cards
 *   bordered — just a border, no shadow (for tight grids)
 *   interactive — adds hover lift + shadow (alias of old .card-hover)
 *
 * See FRONTEND_AUDIT.md C7 / C10 (card consistency).
 */

export type CardVariant = 'default' | 'elevated' | 'bordered' | 'interactive';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Override default padding (var(--space-6)). Pass 0 for flush images. */
  padding?: number | string;
}

export function Card({
  variant = 'default',
  padding,
  className,
  style,
  children,
  ...rest
}: CardProps) {
  const classes = ['card', variant === 'interactive' ? 'card-hover' : '', className ?? '']
    .filter(Boolean)
    .join(' ');

  const mergedStyle: React.CSSProperties = {
    ...(padding !== undefined ? { padding: typeof padding === 'number' ? `${padding}rem` : padding } : null),
    ...(variant === 'elevated' ? { boxShadow: 'var(--shadow-lg)' } : null),
    ...(variant === 'bordered' ? { boxShadow: 'none' } : null),
    ...style,
  };

  return (
    <div className={classes} style={mergedStyle} {...rest}>
      {children}
    </div>
  );
}
