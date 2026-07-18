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
      className="btn bg-danger-light text-danger-hover border border-danger-hover/30 hover:bg-danger hover:text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
    >
      {loading ? '...' : 'Delete'}
    </button>
  );
}
