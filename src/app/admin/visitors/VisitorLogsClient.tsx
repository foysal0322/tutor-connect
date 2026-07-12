'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import styles from '../../dashboard.module.css';

interface VisitorLog {
  id: string;
  ip: string | null;
  userAgent: string | null;
  path: string | null;
  createdAt: Date;
}

interface VisitorLogsClientProps {
  initialStartDate: string;
  initialEndDate: string;
  logs: VisitorLog[];
}

export default function VisitorLogsClient({ initialStartDate, initialEndDate, logs }: VisitorLogsClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  const applyFilters = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (startDate) params.set('startDate', startDate);
    else params.delete('startDate');
    
    if (endDate) params.set('endDate', endDate);
    else params.delete('endDate');

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    router.push(pathname);
  };

  return (
    <div className={styles.recentSection}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3>Visitor Traffic</h3>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className={styles.inputField}
              style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className={styles.inputField}
              style={{ padding: '0.5rem', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
            />
          </div>
          <button 
            onClick={applyFilters}
            className="btn btn-primary"
            style={{ padding: '0.5rem 1rem' }}
          >
            Filter
          </button>
          {(startDate || endDate) && (
            <button 
              onClick={clearFilters}
              className="btn btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {logs.length === 0 ? (
        <p className={styles.emptyState}>No visitor logs found for the selected period.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>IP Address</th>
                <th>Path</th>
                <th>User Agent</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.ip || 'Unknown'}</td>
                  <td>{log.path || '/'}</td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.userAgent || 'Unknown'}>
                    {log.userAgent || 'Unknown'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
