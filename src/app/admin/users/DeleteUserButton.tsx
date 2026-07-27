'use client';

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { deleteUser } from '@/app/actions/admin';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ToastProvider';

/**
 * Delete-user action with a proper confirmation dialog instead of the old
 * window.confirm() call. See FRONTEND_AUDIT.md G4.
 */
export default function DeleteUserButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleConfirm() {
    setLoading(true);
    const res = await deleteUser(userId);
    setLoading(false);
    setOpen(false);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('User deleted.');
    }
  }

  return (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label="Delete user"
      >
        <Trash2 size={14} aria-hidden="true" />
        Delete
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={loading}
        title="Delete this user?"
        tone="danger"
        confirmLabel="Yes, delete"
        description={
          <div>
            <p style={{ marginBottom: '0.5rem' }}>
              This will permanently delete the user and all associated data
              (requests, payments, reviews). This action cannot be undone.
            </p>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--danger)' }}>
              <AlertTriangle size={16} aria-hidden="true" />
              Consider blocking the user instead if you only need to revoke access.
            </p>
          </div>
        }
      />
    </>
  );
}
