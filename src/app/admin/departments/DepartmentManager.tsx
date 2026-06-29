'use client';

import { useState } from 'react';
import { addDepartment, updateDepartment, deleteDepartment } from '@/app/actions/admin';

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
    <div>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}
      
      <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Add New Department</h2>
        <form id="add-dept-form" action={handleAdd} style={{ display: 'flex', gap: '1rem' }}>
          <input name="name" type="text" placeholder="Department Name" required style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
          <button type="submit" className="btn-primary" disabled={loading}>Add</button>
        </form>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '1rem' }}>Department Name</th>
              <th style={{ padding: '1rem', width: '200px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map(dept => (
              <tr key={dept.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem' }} colSpan={editingId === dept.id ? 2 : 1}>
                  {editingId === dept.id ? (
                    <form action={handleEdit} style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                      <input type="hidden" name="id" value={dept.id} />
                      <input name="name" type="text" defaultValue={dept.name} required style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} disabled={loading}>Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} disabled={loading}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    dept.name
                  )}
                </td>
                {editingId !== dept.id && (
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingId(dept.id)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>Edit</button>
                      <button onClick={() => handleDelete(dept.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {departments.length === 0 && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No departments found.</p>}
      </div>
    </div>
  );
}
