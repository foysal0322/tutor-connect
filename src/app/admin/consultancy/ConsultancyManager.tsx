'use client';

import { useState } from 'react';
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
import { MessageSquareText, Tags, Check, X, Clock } from 'lucide-react';

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

export default function ConsultancyManager({ topics, requests }: { topics: Topic[]; requests: Request[] }) {
  const [tab, setTab] = useState<'requests' | 'topics'>('requests');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  async function refreshAfter(promise: Promise<any>, okMsg?: string) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await promise;
    if (res?.error) setError(res.error);
    else if (okMsg) setSuccess(okMsg);
    setLoading(false);
  }

  async function handleAddTopic(formData: FormData) {
    await refreshAfter(addConsultancyTopic(formData), 'Topic added.');
    if (!error) (document.getElementById('add-topic-form') as HTMLFormElement).reset();
  }
  async function handleEditTopic(formData: FormData) {
    await refreshAfter(updateConsultancyTopic(formData), 'Topic updated.');
    if (!error) setEditingId(null);
  }
  async function handleDeleteTopic(id: string) {
    if (!confirm('Delete this topic? Existing bookings keep their link.')) return;
    await refreshAfter(deleteConsultancyTopic(id), 'Topic deleted.');
  }
  async function handleStatusChange(id: string, status: string) {
    await refreshAfter(setConsultancyRequestStatus(id, status), `Marked ${status.toLowerCase()}.`);
  }

  const filteredRequests =
    statusFilter === 'ALL' ? requests : requests.filter((r) => r.status === statusFilter);

  return (
    <div className="flex flex-col gap-6">
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
          <div className="flex items-center gap-2">
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
            <div className="data-grid-container">
              <table className="data-grid hidden md:table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Topic</th>
                    <th>Paid</th>
                    <th>Details</th>
                    <th>Status</th>
                    <th className="w-64">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="font-semibold text-main">{r.student.name}</div>
                        <div className="text-xs text-muted">{r.student.nsuId}</div>
                      </td>
                      <td>
                        <div className="font-medium">{r.consultancyTopic?.title ?? r.topic}</div>
                        {!r.consultancyTopic && (
                          <span className="text-xs text-muted italic">legacy</span>
                        )}
                      </td>
                      <td>
                        {r.pricePaid != null ? (
                          <span className="font-semibold">{formatBDT(r.pricePaid)} BDT</span>
                        ) : (
                          <span className="text-muted">Free</span>
                        )}
                      </td>
                      <td className="max-w-xs">
                        <div className="truncate text-sm text-muted" title={r.details}>
                          {r.details}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_TONE[r.status] ?? 'badge-info'}`}>
                          {r.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {r.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handleStatusChange(r.id, 'COMPLETED')}
                              disabled={loading}
                              className="btn bg-success-light text-success-hover hover:bg-success hover:text-white px-2.5 py-1 text-xs font-semibold rounded-md transition-colors"
                            >
                              <Check size={12} className="inline" /> Complete
                            </button>
                          )}
                          {r.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleStatusChange(r.id, 'CANCELLED')}
                              disabled={loading}
                              className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-2.5 py-1 text-xs font-semibold rounded-md transition-colors"
                            >
                              <X size={12} className="inline" /> Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile card view */}
              <div className="md:hidden flex flex-col gap-3 p-3">
                {filteredRequests.map((r) => (
                  <div key={r.id} className="card p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-semibold">{r.student.name}</div>
                        <div className="text-xs text-muted">{r.student.nsuId}</div>
                      </div>
                      <span className={`badge ${STATUS_TONE[r.status] ?? 'badge-info'}`}>{r.status}</span>
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">{r.consultancyTopic?.title ?? r.topic}</span>
                      {r.pricePaid != null ? (
                        <span className="ml-2 text-primary font-semibold">
                          {formatBDT(r.pricePaid)} BDT
                        </span>
                      ) : (
                        <span className="ml-2 text-muted">Free</span>
                      )}
                    </div>
                    <p className="text-xs text-muted">{r.details}</p>
                    <div className="flex gap-2 mt-1">
                      {r.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleStatusChange(r.id, 'COMPLETED')}
                          disabled={loading}
                          className="btn flex-1 bg-success-light text-success-hover hover:bg-success hover:text-white px-2.5 py-1.5 text-xs font-semibold rounded-md"
                        >
                          Complete
                        </button>
                      )}
                      {r.status !== 'CANCELLED' && (
                        <button
                          onClick={() => handleStatusChange(r.id, 'CANCELLED')}
                          disabled={loading}
                          className="btn flex-1 bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-2.5 py-1.5 text-xs font-semibold rounded-md"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {filteredRequests.length === 0 && (
                <div className="p-8 text-center text-muted">No requests match this filter.</div>
              )}
            </div>
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
            <div className="data-grid-container">
              <table className="data-grid hidden md:table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th className="w-48">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {topics.map((t) => (
                    <tr key={t.id}>
                      {editingId === t.id ? (
                        <>
                          <td>
                            <form action={handleEditTopic} className="flex flex-col gap-3">
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
                                <input
                                  type="checkbox"
                                  name="isActive"
                                  defaultChecked={t.isActive}
                                  className="w-4 h-4"
                                />
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
                          </td>
                          <td colSpan={3} />
                        </>
                      ) : (
                        <>
                          <td>
                            <div className="font-semibold text-main">{t.title}</div>
                            {t.description && (
                              <div className="text-xs text-muted">{t.description}</div>
                            )}
                          </td>
                          <td>
                            {t.price > 0 ? (
                              <span className="font-semibold">{formatBDT(t.price)} BDT</span>
                            ) : (
                              <span className="text-muted">Free</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`badge ${t.isActive ? 'badge-success' : 'badge-warning'}`}
                            >
                              {t.isActive ? 'Active' : 'Hidden'}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingId(t.id)}
                                disabled={loading}
                                className="btn bg-gray-100 text-main hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteTopic(t.id)}
                                disabled={loading}
                                className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile view */}
              <div className="md:hidden flex flex-col gap-3 p-3">
                {topics.map((t) => (
                  <div key={t.id} className="card p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="font-semibold">{t.title}</div>
                        {t.description && (
                          <div className="text-xs text-muted">{t.description}</div>
                        )}
                      </div>
                      <span className={`badge ${t.isActive ? 'badge-success' : 'badge-warning'}`}>
                        {t.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </div>
                    <div className="text-sm">
                      {t.price > 0 ? (
                        <span className="font-semibold">{formatBDT(t.price)} BDT</span>
                      ) : (
                        <span className="text-muted">Free</span>
                      )}
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => setEditingId(t.id)}
                        disabled={loading}
                        className="btn flex-1 bg-gray-100 text-main hover:bg-gray-200 px-3 py-1.5 text-sm font-semibold rounded-md"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(t.id)}
                        disabled={loading}
                        className="btn flex-1 bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-3 py-1.5 text-sm font-semibold rounded-md"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {topics.length === 0 && (
                <div className="p-8 text-center text-muted">No topics yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
