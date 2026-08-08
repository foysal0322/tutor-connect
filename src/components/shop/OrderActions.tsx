'use client';

import { useState, useTransition } from 'react';
import { Truck, CheckCircle2, XCircle, PackageCheck } from 'lucide-react';
import {
  cancelOrder,
  completeOrder,
  confirmDelivery,
  markShipped,
} from '@/app/(member)/shop/orders/actions';
import styles from './OrderActions.module.css';

type OrderStatus =
  | 'AWAITING_CONFIRMATION'
  | 'ESCROWED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';

interface Props {
  orderId: string;
  status: OrderStatus;
  role: 'buyer' | 'seller';
}

type Action = 'ship' | 'confirm' | 'complete' | 'cancel';

const ACTION_LABELS: Record<Action, { label: string; icon: React.ReactNode; danger?: boolean }> = {
  ship: { label: 'Mark as shipped', icon: <Truck size={14} /> },
  confirm: { label: 'Confirm delivery', icon: <PackageCheck size={14} /> },
  complete: { label: 'Complete order', icon: <CheckCircle2 size={14} /> },
  cancel: { label: 'Cancel order', icon: <XCircle size={14} />, danger: true },
};

export default function OrderActions({ orderId, status, role }: Props) {
  const [pending, setPending] = useState<Action | null>(null);
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();

  function availableActions(): Action[] {
    const actions: Action[] = [];
    if (role === 'seller' && status === 'ESCROWED') actions.push('ship');
    if (role === 'buyer' && status === 'SHIPPED') actions.push('confirm');
    if (role === 'buyer' && status === 'DELIVERED') actions.push('complete');
    if (role === 'buyer' && (status === 'ESCROWED' || status === 'AWAITING_CONFIRMATION')) {
      actions.push('cancel');
    }
    return actions;
  }

  async function run(action: Action) {
    setPending(action);
    setError('');
    startTransition(async () => {
      const fd = new FormData();
      fd.set('orderId', orderId);
      const res =
        action === 'ship'
          ? await markShipped(fd)
          : action === 'confirm'
            ? await confirmDelivery(fd)
            : action === 'complete'
              ? await completeOrder(fd)
              : await cancelOrder(fd);
      if (!res.ok) setError(res.error);
      setPending(null);
    });
  }

  const actions = availableActions();
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={styles.wrap}>
      {error && (
        <div role='alert' className={styles.error}>
          {error}
        </div>
      )}
      <div className={styles.stack}>
        {actions.map((action) => {
          const meta = ACTION_LABELS[action];
          const isPending = pending === action;
          const needsConfirm = action === 'cancel' || action === 'complete';
          return (
            <button
              key={action}
              type='button'
              className={`${styles.btn} ${meta.danger ? styles.danger : ''}`}
              disabled={pending !== null}
              onClick={() => {
                if (needsConfirm && !confirm(`Are you sure? ${meta.label}`)) return;
                run(action);
              }}
            >
              {meta.icon}
              <span>{isPending ? 'Working…' : meta.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
