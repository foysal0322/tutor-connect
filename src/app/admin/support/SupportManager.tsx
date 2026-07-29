'use client';

import { useState } from 'react';
import DataGrid, { ColumnDef } from '@/components/ui/DataGrid';
import { resolveSupportTicket } from '@/app/actions/support';
import { Select } from '@/components/ui/Select';

type TicketRow = {
  id: string;
  name: string;
  email: string;
  contact?: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
};

const TYPE_BADGE: Record<string, string> = {
  REFUND: 'bg-danger-light text-danger-hover',
  COMPLAINT: 'bg-warning-light text-warning-hover',
  SUGGESTION: 'badge-primary',
};

export default function SupportManager({ initialTickets }: { initialTickets: any[] }) {
  const [tickets, setTickets] = useState<TicketRow[]>(
    initialTickets.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      contact: t.contact,
      type: t.type,
      message: t.message,
      status: t.status,
      createdAt: new Date(t.createdAt).toLocaleDateString(),
    }))
  );
  const [statusFilter, setStatusFilter] = useState('');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const filtered = statusFilter ? tickets.filter((t) => t.status === statusFilter) : tickets;

  async function handleResolve(id: string) {
    if (!confirm('Mark this ticket as resolved?')) return;
    setResolvingId(id);
    const res = await resolveSupportTicket(id);
    if (res?.error) {
      alert(res.error);
    } else {
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'RESOLVED' } : t)));
    }
    setResolvingId(null);
  }

  const columns: ColumnDef<TicketRow>[] = [
    {
      header: 'Contact',
      accessorKey: 'name',
      cell: (row) => (
        <div>
          <div className="font-semibold text-main">{row.name}</div>
          <a href={`mailto:${row.email}`} className="text-xs text-primary hover:underline">{row.email}</a>
          {row.contact && (
            <div className="text-xs text-muted mt-1">
              <a href={`tel:${row.contact}`} className="hover:underline">{row.contact}</a>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Type',
      accessorKey: 'type',
      cell: (row) => <span className={`badge ${TYPE_BADGE[row.type] ?? 'badge-primary'}`}>{row.type}</span>,
    },
    {
      header: 'Message',
      accessorKey: 'message',
      cell: (row) => (
        <div className="max-w-xs whitespace-normal break-words text-sm text-muted">{row.message}</div>
      ),
    },
    { header: 'Date', accessorKey: 'createdAt' },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <span className={`badge ${row.status === 'PENDING' ? 'badge-warning' : 'badge-success'}`}>
          {row.status}
        </span>
      ),
    },
    {
      header: 'Action',
      cell: (row) =>
        row.status === 'PENDING' ? (
          <button
            onClick={() => handleResolve(row.id)}
            disabled={resolvingId === row.id}
            className="btn bg-success text-white hover:bg-success-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
          >
            {resolvingId === row.id ? '...' : 'Resolve'}
          </button>
        ) : (
          <span className="text-muted text-sm italic">Done</span>
        ),
    },
  ];

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-color bg-gray-50/50">
        <div className="w-full sm:w-64 ml-auto">
          <Select
            label="Filter by status"
            hideLabel
            value={statusFilter}
            onChange={setStatusFilter}
            placeholderOption="All Statuses"
            options={[
              { value: 'PENDING', label: 'Pending' },
              { value: 'RESOLVED', label: 'Resolved' },
            ]}
          />
        </div>
      </div>

      <DataGrid
        data={filtered}
        columns={columns}
        searchable={false}
        emptyMessage="No support tickets found."
      />
    </div>
  );
}
