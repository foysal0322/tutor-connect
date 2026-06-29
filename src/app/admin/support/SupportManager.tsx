'use client';

import { useState, useMemo } from 'react';
import styles from '../../dashboard.module.css';
import { resolveSupportTicket } from '@/app/actions/support';

export default function SupportManager({ initialTickets }: { initialTickets: any[] }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [statusFilter, setStatusFilter] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (statusFilter) {
      result = result.filter(t => t.status === statusFilter);
    }
    // Sort PENDING on top
    result.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [tickets, statusFilter]);

  async function handleResolve(id: string) {
    if (!confirm('Mark this ticket as resolved?')) return;
    setResolvingId(id);
    const res = await resolveSupportTicket(id);
    if (res?.error) {
      alert(res.error);
    } else {
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'RESOLVED' } : t));
    }
    setResolvingId(null);
  }

  const getTypeColor = (type: string) => {
    if (type === 'REFUND') return { bg: '#fee2e2', text: '#b91c1c' };
    if (type === 'COMPLAINT') return { bg: '#fef3c7', text: '#d97706' };
    return { bg: '#e0e7ff', text: '#4338ca' };
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
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <div className={styles.tableResponsive}>
          <table className={styles.table}>
          <thead>
            <tr>
              <th>Contact Info</th>
              <th>Type</th>
              <th>Message</th>
              <th>Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.length > 0 ? (
              filteredTickets.map(ticket => {
                const colors = getTypeColor(ticket.type);
                return (
                  <tr key={ticket.id}>
                    <td>
                      <strong>{ticket.name}</strong><br/>
                      <a href={`mailto:${ticket.email}`} style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>{ticket.email}</a>
                      {ticket.contact && (
                        <>
                          <br/>
                          <a href={`tel:${ticket.contact}`} style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{ticket.contact}</a>
                        </>
                      )}
                    </td>
                    <td>
                      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600, backgroundColor: colors.bg, color: colors.text }}>
                        {ticket.type}
                      </span>
                    </td>
                    <td style={{ maxWidth: '300px', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: '0.9rem' }}>
                      {ticket.message}
                    </td>
                    <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span style={{ 
                        padding: '0.25rem 0.5rem', 
                        borderRadius: '4px', 
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        backgroundColor: ticket.status === 'PENDING' ? '#fef3c7' : '#d1fae5',
                        color: ticket.status === 'PENDING' ? '#d97706' : '#047857'
                      }}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      {ticket.status === 'PENDING' ? (
                        <button 
                          onClick={() => handleResolve(ticket.id)}
                          disabled={resolvingId === ticket.id}
                          className="btn-primary"
                          style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }}
                        >
                          {resolvingId === ticket.id ? 'Resolving...' : 'Resolve'}
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Done</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  No support tickets found.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
