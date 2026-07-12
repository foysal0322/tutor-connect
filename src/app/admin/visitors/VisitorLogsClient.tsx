'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search, Calendar, Filter, X, Eye, MonitorSmartphone, MapPin, Clock } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');

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
    setSearchTerm('');
    router.push(pathname);
  };

  const filteredLogs = logs.filter(log => 
    (log.path?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || 
    (log.ip?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (log.userAgent?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border-color)', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={18} />
              </div>
              <input 
                type="text" 
                placeholder="Search by path, IP or user agent..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-color)', color: 'var(--text-main)', fontSize: '0.9rem', transition: 'all 0.2s' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.25rem 0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <Calendar size={16} color="var(--text-muted)" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                style={{ border: 'none', background: 'transparent', color: 'var(--text-main)', fontSize: '0.85rem', outline: 'none' }}
              />
            </div>
            
            <button 
              onClick={applyFilters}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}
            >
              <Filter size={16} /> Filter
            </button>
            
            {(startDate || endDate || searchTerm) && (
              <button 
                onClick={clearFilters}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '8px', fontWeight: 500, cursor: 'pointer', transition: 'background 0.2s' }}
              >
                <X size={16} /> Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: '12px', boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        {filteredLogs.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ display: 'inline-flex', padding: '1rem', background: 'var(--bg-color)', borderRadius: '50%', marginBottom: '1rem' }}>
              <Eye size={32} color="var(--primary-light)" />
            </div>
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-main)' }}>No logs found</h3>
            <p>Try adjusting your search or date filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className={styles.table} style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-color)', borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>Time & Date</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>IP Address</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>Page Path</th>
                  <th style={{ padding: '1rem 1.5rem', fontWeight: 600, color: 'var(--text-muted)', textAlign: 'left' }}>Device / Agent</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid var(--border-color)', transition: 'background 0.2s' }} onMouseOver={e => e.currentTarget.style.background = 'var(--bg-color)'} onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Clock size={16} color="var(--text-muted)" />
                        <div>
                          <div style={{ fontWeight: 500 }}>{new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <div style={{ alignItems: 'center', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.25rem 0.75rem', borderRadius: '12px', display: 'inline-flex' }}>
                        <MapPin size={14} color="var(--primary)" />
                        <span style={{ fontFamily: 'monospace' }}>{log.ip || 'Unknown'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '1rem 1.5rem' }}>
                      <span style={{ fontWeight: 500, color: 'var(--primary)' }}>{log.path || '/'}</span>
                    </td>
                    <td style={{ padding: '1rem 1.5rem', maxWidth: '300px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <MonitorSmartphone size={16} color="var(--text-muted)" style={{ marginTop: '3px', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', fontSize: '0.85rem', color: 'var(--text-muted)' }} title={log.userAgent || 'Unknown'}>
                          {log.userAgent || 'Unknown'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
