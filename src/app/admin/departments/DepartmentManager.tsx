'use client';

import { useState } from 'react';
import { addDepartment, updateDepartment, deleteDepartment } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import DataGrid, { type ColumnDef, type RowAction } from '@/components/ui/DataGrid';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Pencil, Trash2 } from 'lucide-react';

type Department = { id: string; name: string };

export default function DepartmentManager({ departments }: { departments: Department[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const { confirm, dialog } = useConfirmDialog();

  async function handleAdd(formData: FormData) {
    setLoading(true);
    setError('');
    const res = await addDepartment(formData);
    if (res?.error) setError(res.error);
    else (document.getElementById('add-dept-form') as HTMLFormElement).reset();
    setLoading(false);
  }

  async function handleEdit(formData: FormData) {
    setLoading(true);
    setError('');
    const res = await updateDepartment(formData);
    if (res?.error) setError(res.error);
    else setEditingId(null);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    const ok = await confirm({
      title: 'Delete department?',
      description:
        'This cannot be undone. Departments with associated courses or users cannot be deleted.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setLoading(true);
    setError('');
    const res = await deleteDepartment(id);
    if (res?.error) setError(res.error);
    setLoading(false);
  }

  const columns: ColumnDef<Department>[] = [
    {
      header: 'Department Name',
      accessorKey: 'name',
      cell: (dept) => <span className="font-semibold text-main">{dept.name}</span>,
    },
  ];

  const actions = (dept: Department): RowAction<Department>[] => [
    {
      label: 'Edit',
      icon: <Pencil size={14} />,
      onSelect: () => setEditingId(dept.id),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onSelect: () => handleDelete(dept.id),
      danger: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {dialog}
      {error && <FormAlert>{error}</FormAlert>}

      <div className="card">
        <h2 className="text-lg font-bold text-main mb-4">Add New Department</h2>
        <form id="add-dept-form" action={handleAdd} className="flex flex-col gap-4">
          <Input
            containerClassName={fieldClass}
            name="name"
            type="text"
            label="Department Name"
            required
          />
          <FormSubmit loading={loading} loadingText="Adding...">
            Add Department
          </FormSubmit>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <DataGrid
          data={departments}
          columns={columns}
          searchable={false}
          getRowId={(dept) => dept.id}
          rowActions={actions}
          editingRowId={editingId}
          renderEditableRow={(dept) => (
            <form action={handleEdit} className="flex flex-col sm:flex-row gap-4 w-full">
              <input type="hidden" name="id" value={dept.id} />
              <div className="flex-1">
                <Input
                  containerClassName={fieldClass}
                  name="name"
                  type="text"
                  defaultValue={dept.name}
                  label="Department Name"
                  required
                />
              </div>
              <div className="flex gap-2 items-center">
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
          )}
          emptyState={{ title: 'No departments yet' }}
        />
      </div>
    </div>
  );
}
