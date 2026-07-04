'use client';

import { useState, useMemo } from 'react';
import { verifyWithdrawalRequest } from './actions';
import styles from '../../dashboard.module.css';

interface WithdrawalManagerProps {
  initialRequests: any[];
}

export default function WithdrawalManager({ initialRequests }: WithdrawalManagerProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (statusFilter) {
      result = result.filter(w => w.status === statusFilter);
    }
    // Sort PENDING on top, then by date descending
    result.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [requests, statusFilter]);

  const handleVerify = async (id: string, approve: boolean) => {
    const actionName = approve ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${actionName} this withdrawal request?`)) return;

    setLoadingId(id);
    const res = await verifyWithdrawalRequest(id, approve);
    if (res?.error) {
      alert(res.error);
    } else {
      setRequests(prev => prev.map(w => w.id === id ? { ...w, status: approve ? 'APPROVED' : 'REJECTED' } : w));
    }
    setLoadingId(null);
  };

  const getMfsColor = (type: string) => {
    if (type === 'BKASH') return '#d1417a';
    if (type === 'NAGAD') return '#f67221';
    return '#8c2a8c';
  };

  return (
    <div className={styles.card}>
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Tutor</th>
              <th>Requested Amount</th>
              <th>Platform Fee (5%)</th>
              <th>Net Payout (95%)</th>
              <th>MFS Method & Account</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(w => (
                <tr key={w.id}>
                  <td>
                    <strong>{w.tutor.name}</strong><br/>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Email: {w.tutor.email}</span>
                  </td>
                  <td>{w.amount.toFixed(2)} BDT</td>
                  <td>{w.platformFee.toFixed(2)} BDT</td>
                  <td><strong>{w.netAmount.toFixed(2)} BDT</strong></td>
                  <td>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: getMfsColor(w.mfsType) }}>
                      {w.mfsType}
                    </span><br/>
                    <strong>{w.accountNumber}</strong><br/>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Type: {w.transferType}</span>
                  </td>
                  <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      backgroundColor: w.status === 'PENDING' ? '#e0e7ff' : (w.status === 'APPROVED' ? '#d1fae5' : '#fee2e2'),
                      color: w.status === 'PENDING' ? '#4f46e5' : (w.status === 'APPROVED' ? '#047857' : '#ef4444')
                    }}>
                      {w.status}
                    </span>
                  </td>
                  <td>
                    {w.status === 'PENDING' ? (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => handleVerify(w.id, true)}
                          disabled={loadingId === w.id}
                          className="btn"
                          style={{ background: 'var(--success)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleVerify(w.id, false)}
                          disabled={loadingId === w.id}
                          className="btn"
                          style={{ background: 'var(--error)', color: 'white', padding: '0.35rem 0.75rem', borderRadius: '6px', fontSize: '0.85rem' }}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Processed</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No withdrawal requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
