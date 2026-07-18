'use client';

import { useState, useMemo } from 'react';
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

  const getTypeColorClass = (type: string) => {
    if (type === 'REFUND') return 'bg-danger-light text-danger-hover';
    if (type === 'COMPLAINT') return 'bg-warning-light text-warning-hover';
    return 'badge-primary';
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-color bg-gray-50/50">
        <div className="w-full sm:w-64 ml-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select h-[42px]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <div className="data-grid-container">
        <table className="data-grid hidden.md:table">
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
                return (
                  <tr key={ticket.id}>
                    <td>
                      <div className="font-semibold text-main">{ticket.name}</div>
                      <a href={`mailto:${ticket.email}`} className="text-xs text-primary hover:underline">{ticket.email}</a>
                      {ticket.contact && (
                        <div className="text-xs text-muted mt-1">
                          <a href={`tel:${ticket.contact}`} className="hover:underline">{ticket.contact}</a>
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${getTypeColorClass(ticket.type)}`}>
                        {ticket.type}
                      </span>
                    </td>
                    <td className="max-w-xs whitespace-normal break-words text-sm text-muted">
                      {ticket.message}
                    </td>
                    <td>{new Date(ticket.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${ticket.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      {ticket.status === 'PENDING' ? (
                        <button 
                          onClick={() => handleResolve(ticket.id)}
                          disabled={resolvingId === ticket.id}
                          className="btn bg-success text-white hover:bg-success-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                        >
                          {resolvingId === ticket.id ? '...' : 'Resolve'}
                        </button>
                      ) : (
                        <span className="text-muted text-sm italic">Done</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted">
                  No support tickets found.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50">
          {filteredTickets.length > 0 ? (
            filteredTickets.map(ticket => (
              <div key={ticket.id} className="card p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-color pb-3">
                  <div>
                    <div className="font-semibold text-main text-lg">{ticket.name}</div>
                    <a href={`mailto:${ticket.email}`} className="text-sm text-primary hover:underline">{ticket.email}</a>
                    {ticket.contact && (
                      <div className="text-sm text-muted mt-0.5">
                        <a href={`tel:${ticket.contact}`} className="hover:underline">{ticket.contact}</a>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className={`badge ${ticket.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
                      {ticket.status}
                    </span>
                    <span className={`badge ${getTypeColorClass(ticket.type)}`}>
                      {ticket.type}
                    </span>
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded text-sm text-muted">
                  {ticket.message}
                </div>
                
                <div className="text-xs text-muted text-right mt-1">
                  Submitted on {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
                
                {ticket.status === 'PENDING' && (
                  <div className="mt-2 pt-3 border-t border-color">
                    <button 
                      onClick={() => handleResolve(ticket.id)}
                      disabled={resolvingId === ticket.id}
                      className="btn w-full bg-success text-white hover:bg-success-hover px-3 py-2 text-sm font-semibold rounded-md transition-colors"
                    >
                      {resolvingId === ticket.id ? 'Resolving...' : 'Mark as Resolved'}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted">
              No support tickets found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
