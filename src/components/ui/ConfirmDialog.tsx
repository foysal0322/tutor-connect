'use client';

import React, { useState, useCallback } from 'react';
import { Modal } from './Modal';
import { Button, ButtonProps } from './Button';

/**
 * Confirmation dialog for destructive or irreversible actions.
 *
 * Replaces window.confirm() (which is blocking, ugly, and untestable) and
 * the ad-hoc confirm patterns scattered across the platform's pages.
 *
 * Usage:
 *   const confirm = useConfirmDialog();
 *   ...
 *   if (await confirm({ title: 'Delete user?', tone: 'danger' })) { ... }
 *
 * Or controlled:
 *   <ConfirmDialog open={open} onClose={...} onConfirm={...} title="..." />
 *
 * See FRONTEND_AUDIT.md G4.
 */

export interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ButtonProps['variant'];
  /** Disable the confirm button (e.g. while async action is in-flight). */
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onClose,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} disableBackdropClose>
      {description && (
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6 }}>
          {description}
        </div>
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 'var(--space-3)',
          marginTop: 'var(--space-6)',
        }}
      >
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant={tone} onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

/**
 * Imperative hook API for cases where rendering a controlled component
 * inline is awkward. Returns a `confirm` function that resolves to a boolean.
 */
export function useConfirmDialog() {
  const [state, setState] = useState<{
    open: boolean;
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    tone?: ButtonProps['variant'];
    resolve?: (v: boolean) => void;
    loading?: boolean;
  }>({ open: false, title: '' });

  const confirm = useCallback(
    (opts: {
      title: string;
      description?: React.ReactNode;
      confirmLabel?: string;
      tone?: ButtonProps['variant'];
    }) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, resolve, ...opts });
      }),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      setState((s) => {
        s.resolve?.(result);
        return { open: false, title: '' };
      });
    },
    [],
  );

  const dialog = (
    <ConfirmDialog
      open={state.open}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel ?? 'Confirm'}
      tone={state.tone ?? 'primary'}
      onConfirm={() => close(true)}
      onClose={() => close(false)}
    />
  );

  return { confirm, dialog };
}
