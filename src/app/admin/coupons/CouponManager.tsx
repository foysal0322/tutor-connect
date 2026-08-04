'use client';

import { useState } from 'react';
import { addCoupon, updateCoupon, deleteCoupon } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormSubmit, FormAlert, FormCard, FormSection, fieldClass } from '@/components/forms';
import { format } from 'date-fns';
import { TicketPercent, Pencil, Trash2, Plus } from 'lucide-react';

type Coupon = {
  id: string;
  code: string;
  scope: string;
  discountType: string;
  value: number;
  minAmount: number;
  maxDiscount: number | null;
  usageLimit: number | null;
  usedCount: number;
  validFrom: string;
  validUntil: string | null;
  isActive: boolean;
  redemptions: number;
  createdAt: string;
};

const SCOPE_TONE: Record<string, string> = {
  COMMISSION: 'badge-info',
  TUITION: 'badge-primary',
  CONSULTANCY: 'badge-warning',
};

function describeValue(c: Coupon) {
  if (c.discountType === 'PERCENT') {
    return c.maxDiscount
      ? `${c.value}% (max ${c.maxDiscount} BDT)`
      : `${c.value}%`;
  }
  return `${c.value} BDT`;
}

function CouponFields({
  defaultValues,
  scopeOptions,
  typeOptions,
}: {
  defaultValues?: Partial<Coupon>;
  scopeOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
}) {
  return (
    <>
      <FormSection>
        <Input
          containerClassName={fieldClass}
          name="code"
          type="text"
          label="Code"
          placeholder="e.g. WELCOME50"
          defaultValue={defaultValues?.code}
          required
        />
        <Select
          containerClassName={fieldClass}
          name="scope"
          label="Scope"
          defaultValue={defaultValues?.scope ?? 'COMMISSION'}
          options={scopeOptions}
        />
        <Select
          containerClassName={fieldClass}
          name="discountType"
          label="Discount Type"
          defaultValue={defaultValues?.discountType ?? 'PERCENT'}
          options={typeOptions}
        />
        <Input
          containerClassName={fieldClass}
          name="value"
          type="number"
          step="any"
          min="0"
          label="Value (% or BDT)"
          defaultValue={defaultValues?.value ?? 10}
          required
        />
      </FormSection>
      <FormSection>
        <Input
          containerClassName={fieldClass}
          name="minAmount"
          type="number"
          step="any"
          min="0"
          label="Min Amount (BDT)"
          defaultValue={defaultValues?.minAmount ?? 0}
        />
        <Input
          containerClassName={fieldClass}
          name="maxDiscount"
          type="number"
          step="any"
          min="0"
          label="Max Discount (BDT, optional)"
          defaultValue={defaultValues?.maxDiscount ?? ''}
        />
        <Input
          containerClassName={fieldClass}
          name="usageLimit"
          type="number"
          step="1"
          min="1"
          label="Usage Limit (blank = unlimited)"
          defaultValue={defaultValues?.usageLimit ?? ''}
        />
        <Input
          containerClassName={fieldClass}
          name="validUntil"
          type="datetime-local"
          label="Valid Until (optional)"
          defaultValue={
            defaultValues?.validUntil
              ? format(new Date(defaultValues.validUntil), "yyyy-MM-dd'T'HH:mm")
              : ''
          }
        />
      </FormSection>
      <label className="flex items-center gap-2 text-sm text-main cursor-pointer mb-2">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={defaultValues?.isActive ?? true}
          className="w-4 h-4"
        />
        Active
      </label>
    </>
  );
}

export default function CouponManager({ coupons }: { coupons: Coupon[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  async function refresh(promise: Promise<any>, okMsg?: string) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = (await promise) as { error?: string; success?: boolean };
    if (res?.error) setError(res.error);
    else if (okMsg) {
      setSuccess(okMsg);
      setEditingId(null);
      setShowAdd(false);
    }
    setLoading(false);
  }

  async function handleAdd(formData: FormData) {
    await refresh(addCoupon(formData), 'Coupon created.');
  }
  async function handleEdit(formData: FormData) {
    await refresh(updateCoupon(formData), 'Coupon updated.');
  }
  async function handleDelete(id: string) {
    if (!confirm('Delete this coupon? Redemption history is preserved.')) return;
    await refresh(deleteCoupon(id), 'Coupon deleted.');
  }

  const scopeOptions = [
    { value: 'COMMISSION', label: 'Commission (tutor withdrawal)' },
    { value: 'TUITION', label: 'Tuition (student payment)' },
    { value: 'CONSULTANCY', label: 'Consultancy booking' },
  ];
  const typeOptions = [
    { value: 'PERCENT', label: 'Percent (%)' },
    { value: 'FLAT', label: 'Flat (BDT)' },
  ];

  return (
    <div className="flex flex-col gap-6">
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone="success">{success}</FormAlert>}

      {/* Add coupon toggle */}
      {!showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary self-start flex items-center gap-2 px-4 py-2 rounded-md"
        >
          <Plus size={16} /> New Coupon
        </button>
      )}
      {showAdd && (
        <FormCard surface="embedded" icon={<TicketPercent size={24} />} title="Create Coupon">
          <form id="add-coupon-form" action={handleAdd} className="flex flex-col gap-4">
            <CouponFields scopeOptions={scopeOptions} typeOptions={typeOptions} />
            <div className="flex gap-2">
              <FormSubmit fullWidth={false} loading={loading} loadingText="Creating...">
                Create
              </FormSubmit>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="btn bg-gray-200 text-main hover:bg-gray-300 px-4 py-2 text-sm font-semibold rounded-md"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </FormCard>
      )}

      {/* List */}
      <div className="card p-0 overflow-hidden">
        <div className="data-grid-container">
          <table className="data-grid hidden md:table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Scope</th>
                <th>Discount</th>
                <th>Min / Cap</th>
                <th>Usage</th>
                <th>Valid Until</th>
                <th>Status</th>
                <th className="w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((c) => {
                if (editingId === c.id) {
                  return (
                    <tr key={c.id}>
                      <td colSpan={8}>
                        <form action={handleEdit} className="p-3">
                          <input type="hidden" name="id" value={c.id} />
                          <CouponFields
                            defaultValues={c}
                            scopeOptions={scopeOptions}
                            typeOptions={typeOptions}
                          />
                          <div className="flex gap-2 mt-2">
                            <FormSubmit fullWidth={false} loading={loading} loadingText="Saving...">
                              Save
                            </FormSubmit>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="btn bg-gray-200 text-main hover:bg-gray-300 px-4 py-2 text-sm font-semibold rounded-md"
                              disabled={loading}
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={c.id}>
                    <td>
                      <code className="bg-white border border-color px-2 py-1 rounded text-xs font-mono font-bold">
                        {c.code}
                      </code>
                    </td>
                    <td>
                      <span className={`badge ${SCOPE_TONE[c.scope] ?? 'badge-info'}`}>
                        {c.scope}
                      </span>
                    </td>
                    <td className="font-semibold">{describeValue(c)}</td>
                    <td className="text-xs text-muted">
                      Min {c.minAmount} BDT
                      {c.maxDiscount ? ` · Cap ${c.maxDiscount}` : ''}
                    </td>
                    <td className="text-xs">
                      {c.usedCount}
                      {c.usageLimit ? ` / ${c.usageLimit}` : ' (no cap)'}
                      <div className="text-muted">{c.redemptions} logged</div>
                    </td>
                    <td className="text-xs text-muted">
                      {c.validUntil ? format(new Date(c.validUntil), 'MMM d, yyyy') : 'No expiry'}
                    </td>
                    <td>
                      <span className={`badge ${c.isActive ? 'badge-success' : 'badge-warning'}`}>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingId(c.id)}
                          disabled={loading}
                          className="btn bg-gray-100 text-main hover:bg-gray-200 p-2 rounded-md"
                          aria-label="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={loading}
                          className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white p-2 rounded-md"
                          aria-label="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3 p-3">
            {coupons.map((c) => (
              <div key={c.id} className="card p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start gap-2">
                  <code className="bg-white border border-color px-2 py-1 rounded text-xs font-mono font-bold">
                    {c.code}
                  </code>
                  <span className={`badge ${SCOPE_TONE[c.scope] ?? 'badge-info'}`}>{c.scope}</span>
                </div>
                <div className="text-sm">
                  <div className="font-semibold">{describeValue(c)}</div>
                  <div className="text-xs text-muted">
                    Min {c.minAmount} BDT
                    {c.maxDiscount ? ` · Cap ${c.maxDiscount}` : ''}
                  </div>
                  <div className="text-xs">
                    Used {c.usedCount}
                    {c.usageLimit ? ` / ${c.usageLimit}` : ' (uncapped)'}
                  </div>
                  <div className="text-xs text-muted">
                    {c.validUntil
                      ? `Until ${format(new Date(c.validUntil), 'MMM d, yyyy')}`
                      : 'No expiry'}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`badge ${c.isActive ? 'badge-success' : 'badge-warning'}`}>
                    {c.isActive ? 'Active' : 'Inactive'}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(c.id)}
                      disabled={loading}
                      className="btn bg-gray-100 text-main hover:bg-gray-200 px-3 py-1.5 text-sm font-semibold rounded-md"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={loading}
                      className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-3 py-1.5 text-sm font-semibold rounded-md"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {coupons.length === 0 && (
            <div className="p-8 text-center text-muted">No coupons yet. Click &quot;New Coupon&quot; to create one.</div>
          )}
        </div>
      </div>
    </div>
  );
}
