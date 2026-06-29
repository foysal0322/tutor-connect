'use client';

import { useState } from 'react';
import { deleteUser } from '@/app/actions/admin';

export default function DeleteUserButton({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone and will delete all associated data.')) {
      return;
    }
    
    setLoading(true);
    const res = await deleteUser(userId);
    if (res?.error) {
      alert(res.error);
    }
    setLoading(false);
  }

  return (
    <button 
      onClick={handleDelete}
      disabled={loading}
      style={{ 
        padding: '0.25rem 0.75rem', 
        fontSize: '0.85rem',
        background: '#fee2e2',
        color: '#b91c1c',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontWeight: 600
      }}>
      {loading ? '...' : 'Delete'}
    </button>
  );
}
