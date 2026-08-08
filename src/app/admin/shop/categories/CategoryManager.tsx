'use client';

import { useState, useTransition } from 'react';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { deleteCategory, saveCategory } from './actions';
import styles from './CategoryManager.module.css';

export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  commissionRateOverride: number | null;
  sortOrder: number;
  isActive: boolean;
  _count: { listings: number };
}

interface Props {
  initialCategories: CategoryRow[];
}

interface Draft {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  commissionRateOverride: string; // percent input
  sortOrder: string;
  isActive: boolean;
}

function emptyDraft(): Draft {
  return {
    id: '',
    name: '',
    slug: '',
    description: '',
    icon: '',
    commissionRateOverride: '',
    sortOrder: '0',
    isActive: true,
  };
}

export default function CategoryManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState<CategoryRow[]>(initialCategories);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  function startCreate() {
    setEditing(emptyDraft());
    setError('');
  }

  function startEdit(c: CategoryRow) {
    setEditing({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? '',
      icon: c.icon ?? '',
      commissionRateOverride:
        c.commissionRateOverride != null
          ? String(Math.round(c.commissionRateOverride * 100))
          : '',
      sortOrder: String(c.sortOrder),
      isActive: c.isActive,
    });
    setError('');
  }

  function cancelEdit() {
    setEditing(null);
    setError('');
  }

  async function save() {
    if (!editing) return;
    if (!editing.name.trim()) {
      setError('Name is required.');
      return;
    }
    setBusy(true);
    setError('');
    const fd = new FormData();
    fd.set('id', editing.id);
    fd.set('name', editing.name.trim());
    fd.set('slug', editing.slug.trim() || editing.name.trim());
    fd.set('description', editing.description.trim());
    fd.set('icon', editing.icon.trim());
    fd.set('commissionRateOverride', editing.commissionRateOverride.trim());
    fd.set('sortOrder', editing.sortOrder);
    fd.set('isActive', editing.isActive ? 'true' : 'false');

    startTransition(async () => {
      const res = await saveCategory(fd);
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Optimistic: just refetch by reloading the page route cache.
      // Re-render the local list with the new shape.
      setCategories((prev) => {
        const slug = editing.slug.trim() || editing.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const rate = editing.commissionRateOverride.trim()
          ? Number(editing.commissionRateOverride) / 100
          : null;
        const row: CategoryRow = {
          id: res.id ?? editing.id ?? `tmp-${Date.now()}`,
          slug,
          name: editing.name.trim(),
          description: editing.description.trim() || null,
          icon: editing.icon.trim() || null,
          commissionRateOverride: rate,
          sortOrder: Number(editing.sortOrder) || 0,
          isActive: editing.isActive,
          _count: { listings: 0 },
        };
        if (editing.id) {
          return prev.map((c) => (c.id === editing.id ? { ...c, ...row } : c));
        }
        return [...prev, row].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
      });
      setEditing(null);
    });
  }

  function remove(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This fails if listings reference it.`)) return;
    setBusy(true);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('id', id);
      const res = await deleteCategory(fd);
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setCategories((prev) => prev.filter((c) => c.id !== id));
    });
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <button type='button' className={styles.newBtn} onClick={startCreate}>
          <Plus size={14} /> New category
        </button>
        {error && (
          <div role='alert' className={styles.error}>
            {error}
          </div>
        )}
      </div>

      {editing && (
        <div className={styles.editor}>
          <h3 className={styles.editorTitle}>
            {editing.id ? 'Edit category' : 'New category'}
          </h3>
          <div className={styles.grid}>
            <label className={styles.field}>
              <span>Name *</span>
              <input
                value={editing.name}
                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                maxLength={80}
                className={styles.input}
                autoFocus
              />
            </label>
            <label className={styles.field}>
              <span>Slug (kebab-case)</span>
              <input
                value={editing.slug}
                onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                maxLength={80}
                placeholder='auto from name'
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span>Icon (lucide name)</span>
              <input
                value={editing.icon}
                onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                maxLength={60}
                placeholder='BookOpen'
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span>Commission override (%)</span>
              <input
                type='number'
                step='any'
                min='0'
                max='20'
                value={editing.commissionRateOverride}
                onChange={(e) => setEditing({ ...editing, commissionRateOverride: e.target.value })}
                className={styles.input}
                placeholder='blank = global default'
              />
            </label>
            <label className={styles.field}>
              <span>Sort order</span>
              <input
                type='number'
                min='0'
                max='999'
                value={editing.sortOrder}
                onChange={(e) => setEditing({ ...editing, sortOrder: e.target.value })}
                className={styles.input}
              />
            </label>
            <label className={styles.field}>
              <span>Active</span>
              <select
                value={editing.isActive ? 'true' : 'false'}
                onChange={(e) => setEditing({ ...editing, isActive: e.target.value === 'true' })}
                className={styles.input}
              >
                <option value='true'>Yes</option>
                <option value='false'>No (hidden)</option>
              </select>
            </label>
            <label className={`${styles.field} ${styles.fullWidth}`}>
              <span>Description</span>
              <textarea
                value={editing.description}
                onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                rows={2}
                maxLength={500}
                className={styles.textarea}
              />
            </label>
          </div>
          <div className={styles.editorActions}>
            <button type='button' className={styles.cancelBtn} onClick={cancelEdit} disabled={busy}>
              <X size={14} /> Cancel
            </button>
            <button type='button' className={styles.saveBtn} onClick={save} disabled={busy}>
              <Check size={14} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className={styles.list}>
        {categories.map((c) => {
          const tone: BadgeTone = c.isActive ? 'success' : 'neutral';
          return (
            <div key={c.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.rowTitle}>
                  {c.name}{' '}
                  <code className={styles.slug}>/{c.slug}</code>
                </div>
                {c.description && (
                  <div className={styles.rowDesc}>{c.description}</div>
                )}
                <div className={styles.rowMeta}>
                  <Badge tone={tone}>{c.isActive ? 'active' : 'hidden'}</Badge>
                  {c.commissionRateOverride != null && (
                    <span>commission: {(c.commissionRateOverride * 100).toFixed(1)}%</span>
                  )}
                  <span>{c._count.listings} active listings</span>
                  <span>order: {c.sortOrder}</span>
                  {c.icon && <span>icon: {c.icon}</span>}
                </div>
              </div>
              <div className={styles.rowActions}>
                <button
                  type='button'
                  className={styles.iconBtn}
                  onClick={() => startEdit(c)}
                  aria-label='Edit'
                >
                  <Pencil size={14} />
                </button>
                <button
                  type='button'
                  className={`${styles.iconBtn} ${styles.danger}`}
                  onClick={() => remove(c.id, c.name)}
                  aria-label='Delete'
                  disabled={c._count.listings > 0}
                  title={c._count.listings > 0 ? 'Has listings — cannot delete' : 'Delete'}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
