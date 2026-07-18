'use client';

import { useState } from 'react';
import { addDepartment, updateDepartment, deleteDepartment } from '@/app/actions/admin';
import FloatingInput from '@/components/ui/FloatingInput';

export default function DepartmentManager({ departments }: { departments: any[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

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
    if (!confirm('Are you sure you want to delete this department?')) return;
    setLoading(true);
    setError('');
    const res = await deleteDepartment(id);
    if (res?.error) setError(res.error);
    setLoading(false);
  }

  return (
    <div className="flex flex-col gap-6">
      {error && <div className="bg-danger-light text-danger-hover p-4 rounded-lg font-medium">{error}</div>}
      
      <div className="card">
        <h2 className="text-lg font-bold text-main mb-4">Add New Department</h2>
        <form id="add-dept-form" action={handleAdd} className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex-1 w-full">
            <FloatingInput name="name" type="text" label="Department Name" required />
          </div>
          <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-6 py-3 font-semibold rounded-lg transition-colors w-full sm:w-auto mt-1" disabled={loading}>
            Add Department
          </button>
        </form>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="data-grid-container">
          <table className="data-grid">
            <thead>
              <tr>
                <th>Department Name</th>
                <th className="w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {departments.map(dept => (
                <tr key={dept.id}>
                  <td colSpan={editingId === dept.id ? 2 : 1}>
                    {editingId === dept.id ? (
                      <form action={handleEdit} className="flex flex-col sm:flex-row gap-4 w-full">
                        <input type="hidden" name="id" value={dept.id} />
                        <div className="flex-1">
                          <FloatingInput name="name" type="text" defaultValue={dept.name} label="Department Name" required />
                        </div>
                        <div className="flex gap-2 items-center mt-1">
                          <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-2 text-sm font-semibold rounded-md transition-colors" disabled={loading}>Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="btn bg-gray-200 text-main hover:bg-gray-300 px-4 py-2 text-sm font-semibold rounded-md transition-colors" disabled={loading}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="font-semibold text-main">{dept.name}</div>
                    )}
                  </td>
                  {editingId !== dept.id && (
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(dept.id)} className="btn bg-gray-100 text-main hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors">Edit</button>
                        <button onClick={() => handleDelete(dept.id)} className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {departments.length === 0 && <div className="p-8 text-center text-muted">No departments found.</div>}
        </div>
      </div>
    </div>
  );
}
