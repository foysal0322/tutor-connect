'use client';

import { useState } from 'react';
import { adminResetPassword } from '@/app/auth/actions/passwordReset';

type RequestStatus = 'PENDING' | 'RESOLVED';

interface User {
  id: string;
  name: string;
  nsuId: string;
  email: string;
  role: string;
}

interface ResetRequest {
  id: string;
  userId: string;
  status: string;
  createdAt: Date;
  user: User;
}

export default function PasswordResetManager({ initialRequests }: { initialRequests: ResetRequest[] }) {
  const [requests, setRequests] = useState<ResetRequest[]>(initialRequests);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleReset = async (requestId: string, userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s password to their NSU ID?')) return;
    
    setLoadingId(requestId);
    const res = await adminResetPassword(requestId, userId);
    
    if (res.success) {
      setRequests(requests.map(req => req.id === requestId ? { ...req, status: 'RESOLVED' } : req));
      alert('Password successfully reset to NSU ID.');
    } else {
      alert(res.message || 'An error occurred.');
    }
    
    setLoadingId(null);
  };

  if (requests.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No password reset requests found.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Date</th>
            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>User Name</th>
            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>NSU ID</th>
            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Role</th>
            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Status</th>
            <th style={{ padding: '1rem', textAlign: 'left', color: 'var(--text-muted)' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req) => (
            <tr key={req.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{new Date(req.createdAt).toLocaleDateString()}</td>
              <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{req.user.name}</td>
              <td style={{ padding: '1rem', color: 'var(--text-main)' }}>{req.user.nsuId}</td>
              <td style={{ padding: '1rem', color: 'var(--text-main)' }}>
                <span style={{ padding: '0.25rem 0.5rem', background: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '0.8rem' }}>
                  {req.user.role}
                </span>
              </td>
              <td style={{ padding: '1rem' }}>
                <span style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  background: req.status === 'PENDING' ? '#fef3c7' : '#d1fae5',
                  color: req.status === 'PENDING' ? '#d97706' : '#059669',
                }}>
                  {req.status}
                </span>
              </td>
              <td style={{ padding: '1rem' }}>
                {req.status === 'PENDING' && (
                  <button
                    onClick={() => handleReset(req.id, req.userId)}
                    disabled={loadingId === req.id}
                    className="btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    {loadingId === req.id ? 'Resetting...' : 'Reset to NSU ID'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
