'use client';

import { useEffect, useRef } from 'react';
import s from './form-theme.module.css';

/**
 * Themed banner shown above a form's fields.
 * tone="error" (default) -> red, role="alert"; tone="success" -> green, role="status".
 *
 * On mount, error banners scroll themselves into view and take focus so the
 * user always sees the message — even on long forms where the submit button
 * is well below the alert.
 */
export function FormAlert({
  children,
  tone = 'error',
}: {
  children: React.ReactNode;
  tone?: 'error' | 'success';
}) {
  const isError = tone === 'error';
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isError) return;
    const el = ref.current;
    if (!el) return;
    // Bring the banner into view, then move focus so screen readers announce
    // it and keyboard users land on it. Wait a frame so layout has settled
    // after the state update that rendered the alert.
    const id = requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [isError]);

  return (
    <div
      ref={ref}
      className={`${isError ? s.alert : s.alertSuccess}${isError ? ` ${s.alertShake}` : ''}`}
      role={isError ? 'alert' : 'status'}
      // Make the banner focusable so we can move keyboard focus to it on mount.
      tabIndex={isError ? -1 : undefined}
    >
      {isError && (
        <span className={s.alertIcon} aria-hidden="true">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </span>
      )}
      <span className={s.alertText}>{children}</span>
    </div>
  );
}
