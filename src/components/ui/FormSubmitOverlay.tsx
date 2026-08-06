'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import styles from './FormSubmitOverlay.module.css';

interface FormSubmitOverlayProps {
  /** Primary line of copy. */
  title?: string;
  /** Secondary line of copy. */
  message?: string;
}

/**
 * Full-viewport dark overlay shown while the parent `<form>`'s async action
 * is running (server action or client async function).
 *
 * Why this exists: React 19 wraps `<form action={asyncFn}>` in a transition,
 * so local `setLoading(true)` calls inside the action are deferred and never
 * paint during the await. `useFormStatus()` is the canonical source of truth
 * — it updates outside the transition, so this overlay reliably shows the
 * moment the action starts and disappears the moment it resolves, errors,
 * or triggers a `redirect()`.
 *
 * Usage: render as a descendant of the form (anywhere inside `<form>...</form>`):
 *
 *   <form action={serverAction}>
 *     ...fields...
 *     <FormSubmitOverlay title="Submitting" message="Please wait…" />
 *   </form>
 *
 * Renders nothing when the form is idle.
 */
export default function FormSubmitOverlay({
  title = 'Submitting…',
  message = 'Please wait a moment.',
}: FormSubmitOverlayProps) {
  const { pending } = useFormStatus();
  // Mount-gate so SSR output matches client output (portals only on client).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!pending || !mounted) return null;

  return createPortal(
    <div className={styles.overlay} role="status" aria-live="polite" aria-busy="true">
      <div className={styles.card}>
        <div className={styles.spinner} aria-hidden="true" />
        {title && <p className={styles.title}>{title}</p>}
        {message && <p className={styles.message}>{message}</p>}
      </div>
    </div>,
    document.body,
  );
}
