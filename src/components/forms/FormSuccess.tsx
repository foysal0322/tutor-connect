import React from 'react';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import s from './form-theme.module.css';

/**
 * Themed post-submit success state: green check badge + title + message +
 * gradient "return home" link. Used by server-action forms that redirect to
 * ?success=true (contact, consultancy).
 */
interface FormSuccessProps {
  title: React.ReactNode;
  children: React.ReactNode;
  homeHref?: string;
  homeLabel?: string;
}

export function FormSuccess({
  title,
  children,
  homeHref = '/',
  homeLabel = 'Return to Home',
}: FormSuccessProps) {
  return (
    <div className={s.success}>
      <div className={s.successBadge}>
        <CheckCircle2 size={36} />
      </div>
      <h2 className={s.successTitle}>{title}</h2>
      <p className={s.successText}>{children}</p>
      <Link href={homeHref} className={s.homeLink}>
        {homeLabel}
      </Link>
    </div>
  );
}
