import React from 'react';
import s from './form-theme.module.css';

/**
 * Themed banner shown above a form's fields.
 * tone="error" (default) -> red, role="alert"; tone="success" -> green, role="status".
 */
export function FormAlert({
  children,
  tone = 'error',
}: {
  children: React.ReactNode;
  tone?: 'error' | 'success';
}) {
  return (
    <div className={tone === 'success' ? s.alertSuccess : s.alert} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}
