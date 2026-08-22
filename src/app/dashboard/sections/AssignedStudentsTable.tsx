'use client';

import { useState } from 'react';
import DataGrid, { type ColumnDef } from '@/components/ui/DataGrid';
import AssignedStudentDetailSheet from './AssignedStudentDetailSheet';

export interface AssignedStudent {
  id: string;
  studentName: string;
  courseName: string;
  topic: string;
  facultyName: string | null;
  preferredMode: string;
  preferredDateTime: string | null;
  budget: number;
  status: string;
  createdAt: string;
  rating: number | null;
  review: string | null;
  student: {
    nsuId: string;
    gender: string | null;
    cgpa: number | null;
    departmentName: string | null;
    /** Null unless the session is ACCEPTED — stripped server-side. */
    email: string | null;
    contact: string | null;
  };
}

const STATUS_CLASS: Record<string, string> = {
  COMPLETED: 'badge-success',
  ACCEPTED: 'badge-info',
  MATCHED: 'badge-warning',
  PAYMENT_PENDING: 'badge-warning',
  CANCELLED: 'badge-danger',
  PENDING: 'badge-warning',
};

function statusBadgeClass(status: string) {
  return STATUS_CLASS[status] ?? 'badge-warning';
}

const columns: ColumnDef<AssignedStudent>[] = [
  {
    header: 'Student',
    accessorKey: 'studentName',
    sortable: true,
    cell: (r) => <strong>{r.studentName}</strong>,
  },
  {
    header: 'Course',
    accessorKey: 'courseName',
    sortable: true,
  },
  {
    header: 'Topic',
    accessorKey: 'topic',
  },
  {
    header: 'Mode',
    accessorKey: 'preferredMode',
  },
  {
    header: 'Time',
    accessorKey: 'preferredDateTime',
    cell: (r) =>
      r.preferredDateTime
        ? new Date(r.preferredDateTime).toLocaleString()
        : 'N/A',
  },
  {
    header: 'Budget',
    accessorKey: 'budget',
    sortable: true,
    cell: (r) => `${r.budget.toLocaleString()} BDT`,
  },
  {
    header: 'Status',
    accessorKey: 'status',
    sortable: true,
    cell: (r) => (
      <span className={`badge ${statusBadgeClass(r.status)}`}>
        {r.status.replace('_', ' ')}
      </span>
    ),
  },
];

export default function AssignedStudentsTable({
  rows,
}: {
  rows: AssignedStudent[];
}) {
  const [selected, setSelected] = useState<AssignedStudent | null>(null);

  if (rows.length === 0) {
    return (
      <div
        style={{
          padding: 'var(--space-6) var(--space-4)',
          color: 'var(--text-muted)',
          textAlign: 'center',
          fontSize: 'var(--text-sm)',
        }}
      >
        You don&apos;t have any assigned students yet. New requests matched to
        you will appear here.
      </div>
    );
  }

  return (
    <>
      <DataGrid
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        onRowClick={(r) => setSelected(r)}
        searchable
        searchKeys={['studentName', 'courseName', 'topic', 'status']}
        itemsPerPage={10}
        emptyMessage="No assigned students found."
      />
      <AssignedStudentDetailSheet
        request={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}
