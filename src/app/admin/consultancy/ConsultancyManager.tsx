'use client';

import { useMemo, useState } from 'react';
import {
  addConsultancyTopic,
  updateConsultancyTopic,
  deleteConsultancyTopic,
  setConsultancyRequestStatus,
} from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { formatBDT } from '@/lib/format';
import DataGrid, { type ColumnDef, type RowAction } from '@/components/ui/DataGrid';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { MessageSquareText, Tags, Check, X, Pencil, Trash2 } from 'lucide-react';

type Topic = {
  id: string;
  title: string;
  description: string | null;
  price: number;
  isActive: boolean;
  createdAt: string;
};

type Request = {
  id: string;
  studentId: string;
  topic: string;
  details: string;
  status: string;
  topicId: string | null;
  pricePaid: number | null;
  createdAt: string;
  student: { id: string; name: string; nsuId: string; email: string };
  consultancyTopic: { id: string; title: string; price: number } | null;
};

const STATUS_TONE: Record<string, string> = {
  PENDING: 'badge-info',
  ASSIGNED: 'badge-warning',
  COMPLETED: 'badge-success',
  CANCELLED: 'badge-danger',
};

export default function ConsultancyManager({
  topics,
  requests,
}: {
  topics: Topic[];
  requests: Request[];
}) {
  const [tab, setTab] = useState<'requests' | 'topics'>('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  async function refreshAfter(promise: Promise<any>, okMsg?: string) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await promise;
    if (res?.error) setError(res.error);
    else if (okMsg) setSuccess(okMsg);
    setLoading(false);
    return res;
  }

  async function handleAddTopic(formData: FormData) {
    const res = await refreshAfter(addConsultancyTopic(formData), 'Topic added.');
    if (res && !res.error) {
      (document.getElementById('add-topic-form') as HTMLFormElement).reset();
    }
  }
  async function handleEditTopic(formData: FormData) {
    const res = await refreshAfter(updateConsultancyTopic(formData), 'Topic updated.');
    if (res && !res.error) setEditingId(null);
  }
  async function handleDeleteTopic(id: string) {
    const ok = await confirm({
      title: 'Delete this topic?',
      description: 'Existing bookings keep their link to the original topic.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    await refreshAfter(deleteConsultancyTopic(id), 'Topic deleted.');
  }
  async function handleStatusChange(id: string, status: string) {
    await refreshAfter(
      setConsultancyRequestStatus(id, status),
      `Marked ${status.toLowerCase()}.`,
    );
  }

  const filteredRequests = useMemo(
    () => (statusFilter === 'ALL' ? requests : requests.filter((r) => r.status === statusFilter)),
    [requests, statusFilter],
  );

  // ── Requests columns + actions ──────────────────────────────────────
  const requestColumns: ColumnDef<Request>[] = [
    {
      header: 'Student',
      accessorKey: 'student',
      cell: (r) => (
        <div>
          <div className="font-semibold text-main">{r.student.name}</div>
          <div className="text-xs text-muted">{r.student.nsuId}</div>
        </div>
      ),
    },
    {
      header: 'Topic',
      accessorKey: 'topic',
      cell: (r) => (
        <div>
          <div className="font-medium">{r.consultancyTopic?.title ?? r.topic}</div>
          {!r.consultancyTopic && (
            <span className="text-xs text-muted italic">legacy</span>
          )}
        </div>
      ),
    },
    {
      header: 'Paid',
      accessorKey: 'pricePaid',
      cell: (r) =>
        r.pricePaid != null ? (
          <span className="font-semibold">{formatBDT(r.pricePaid)} BDT</span>
        ) : (
          <span className="text-muted">Free</span>
        ),
    },
    {
      header: 'Details',
      accessorKey: 'details',
      cell: (r) => (
        <div className="max-w-xs truncate text-sm text-muted" title={r.details}>
          {r.details}
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (r) => (
        <span className={`badge ${STATUS_TONE[r.status] ?? 'badge-info'}`}>{r.status}</span>
      ),
    },
  ];

  const requestActions = (r: Request): RowAction<Request>[] => {
    const out: RowAction<Request>[] = [];
    if (r.status !== 'COMPLETED') {
      out.push({
        label: 'Complete',
        icon: <Check size={14} />,
        onSelect: () => handleStatusChange(r.id, 'COMPLETED'),
      });
    }
    if (r.status !== 'CANCELLED') {
      out.push({
        label: 'Cancel',
        icon: <X size={14} />,
        onSelect: () => handleStatusChange(r.id, 'CANCELLED'),
        danger: true,
      });
    }
    return out;
  };

  // ── Topics columns + actions + edit form ────────────────────────────
  const topicColumns: ColumnDef<Topic>[] = [
    {
      header: 'Title',
      accessorKey: 'title',
      cell: (t) => (
        <div>
          <div className="font-semibold text-main">{t.title}</div>
          {t.description && <div className="text-xs text-muted">{t.description}</div>}
        </div>
      ),
    },
    {
      header: 'Price',
      accessorKey: 'price',
      cell: (t) =>
        t.price > 0 ? (
          <span className="font-semibold">{formatBDT(t.price)} BDT</span>
        ) : (
          <span className="text-muted">Free</span>
        ),
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (t) => (
        <span className={`badge ${t.isActive ? 'badge-success' : 'badge-warning'}`}>
          {t.isActive ? 'Active' : 'Hidden'}
        </span>
      ),
    },
  ];

  const topicActions = (t: Topic): RowAction<Topic>[] => [
    { label: 'Edit', icon: <Pencil size={14} />, onSelect: () => setEditingId(t.id) },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onSelect: () => handleDeleteTopic(t.id),
      danger: true,
    },
  ];

  function renderTopicEditForm(t: Topic) {
    return (
      <form
        action={handleEditTopic}
        className="flex flex-col gap-3"
        style={{ padding: 'var(--space-3) 0' }}
      >
        <input type="hidden" name="id" value={t.id} />
        <Input
          containerClassName={fieldClass}
          name="title"
          defaultValue={t.title}
          label="Title"
          required
        />
        <Textarea
          containerClassName={fieldClass}
          name="description"
          defaultValue={t.description ?? ''}
          label="Description"
          rows={2}
        />
        <Input
          containerClassName={fieldClass}
          name="price"
          type="number"
          step="any"
          min="0"
          defaultValue={t.price}
          label="Price (BDT)"
        />
        <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
          <input type="checkbox" name="isActive" defaultChecked={t.isActive} className="w-4 h-4" />
          Active
        </label>
        <div className="flex gap-2">
          <FormSubmit fullWidth={false} loading={loading} loadingText="Saving...">
            Save
          </FormSubmit>
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="btn bg-gray-200 text-main hover:bg-gray-300 px-4 py-2 text-sm font-semibold rounded-md transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {confirmDialog}
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone="success">{success}</FormAlert>}

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-color">
        <button
          onClick={() => setTab('requests')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'requests' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-main'
          }`}
        >
          Requests ({requests.length})
        </button>
        <button
          onClick={() => setTab('topics')}
          className={`px-4 py-2 text-sm font-semibold transition-colors ${
            tab === 'topics' ? 'text-primary border-b-2 border-primary' : 'text-muted hover:text-main'
          }`}
        >
          Topics ({topics.length})
        </button>
      </div>

      {/* ───────── Requests tab ───────── */}
      {tab === 'requests' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            {['ALL', 'PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === s
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-main hover:bg-gray-200'
                }`}
              >
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </button>
            ))}
          </div>

          <div className="card p-0 overflow-hidden">
            <DataGrid
              data={filteredRequests}
              columns={requestColumns}
              searchable={false}
              getRowId={(r) => r.id}
              rowActions={requestActions}
              emptyState={{
                title: 'No requests match this filter.',
              }}
            />
          </div>
        </div>
      )}

      {/* ───────── Topics tab ───────── */}
      {tab === 'topics' && (
        <div className="flex flex-col gap-6">
          <div className="card">
            <h2 className="text-lg font-bold text-main mb-1 flex items-center gap-2">
              <Tags size={18} /> Add Topic
            </h2>
            <p className="text-sm text-muted mb-4">
              Price 0 = free (counts against student&rsquo;s free quota). Price &gt; 0 = paid (debited
              from wallet at booking).
            </p>
            <form id="add-topic-form" action={handleAddTopic} className="flex flex-col gap-4">
              <Input
                containerClassName={fieldClass}
                name="title"
                type="text"
                label="Title"
                labelIcon={<MessageSquareText size={14} />}
                required
              />
              <Textarea
                containerClassName={fieldClass}
                name="description"
                label="Description (optional)"
                rows={2}
              />
              <Input
                containerClassName={fieldClass}
                name="price"
                type="number"
                step="any"
                min="0"
                label="Price (BDT)"
                defaultValue="0"
              />
              <label className="flex items-center gap-2 text-sm text-main cursor-pointer">
                <input type="checkbox" name="isActive" defaultChecked className="w-4 h-4" />
                Active (visible on /consultancy)
              </label>
              <FormSubmit loading={loading} loadingText="Adding...">
                Add Topic
              </FormSubmit>
            </form>
          </div>

          <div className="card p-0 overflow-hidden">
            <DataGrid
              data={topics}
              columns={topicColumns}
              searchable={false}
              getRowId={(t) => t.id}
              rowActions={topicActions}
              editingRowId={editingId}
              renderEditableRow={renderTopicEditForm}
              emptyState={{ title: 'No topics yet.' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
