'use client';

import { useState } from 'react';
import { cancelTutorRequest } from './actions';

export default function CancelRequestButton({ requestId }: { requestId: string }) {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm('Are you sure you want to cancel this request?')) return;
    setLoading(true);
    const res = await cancelTutorRequest(requestId);
    if (res?.error) {
      alert(res.error);
    }
    setLoading(false);
  }

  return (
    <button 
      onClick={handleCancel}
      disabled={loading}
      style={{ 
        padding: '0.25rem 0.5rem', 
        fontSize: '0.8rem', 
        cursor: 'pointer', 
        background: '#fee2e2', 
        color: '#b91c1c', 
        border: 'none', 
        borderRadius: '4px', 
        fontWeight: 600,
        marginLeft: '1rem'
      }}
    >
      {loading ? '...' : 'Cancel'}
    </button>
  );
}
