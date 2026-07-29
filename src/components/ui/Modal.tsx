'use client';

import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * Accessible modal/dialog primitive.
 *
 * - Renders into document.body via portal (escapes stacking contexts).
 * - Traps focus while open and restores it to the trigger on close.
 * - Closes on Escape and on backdrop click.
 * - aria-modal, role="dialog", aria-labelledby wired up.
 *
 * See FRONTEND_AUDIT.md C7 / D4.
 */

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** When true, clicking the backdrop does NOT close (use for confirm flows). */
  disableBackdropClose?: boolean;
  /** Override default max-width (28rem). */
  maxWidth?: number | string;
  children: React.ReactNode;
  /** Optional footer slot (actions). */
  footer?: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  disableBackdropClose = false,
  maxWidth = '32rem',
  children,
  footer,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useStableId('modal-title');

  // Trap focus while open.
  useFocusTrap(panelRef, open);

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  const panelStyle: React.CSSProperties = {
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}rem` : maxWidth,
  };

  return createPortal(
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (!disableBackdropClose && e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: 'var(--space-4)',
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className="card"
        style={{
          ...panelStyle,
          width: '100%',
          background: 'var(--card-bg)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 'var(--space-5) var(--space-6)',
              borderBottom: '1px solid var(--border-color)',
            }}
          >
            <h2 id={titleId} style={{ fontSize: 'var(--text-xl)', fontWeight: 700, margin: 0 }}>
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 'var(--space-1)',
                display: 'inline-flex',
                alignItems: 'center',
                borderRadius: 'var(--radius-sm)',
              }}
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        )}
        <div style={{ padding: 'var(--space-6)' }}>{children}</div>
        {footer && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 'var(--space-3)',
              padding: 'var(--space-4) var(--space-6)',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

// Tiny id hook so SSR and CSR match (no useId mismatches).
function useStableId(prefix: string): string {
  const [id] = React.useState(() => `${prefix}-${Math.random().toString(36).slice(2, 9)}`);
  return id;
}
