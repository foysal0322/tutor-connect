'use client';

import { useMemo, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  CircleDashed,
  Clock,
  GraduationCap,
  Layers,
  Pencil,
  Plus,
  Power,
  Search,
  Tag,
  Trash2,
  User,
  CheckSquare,
  Square,
  CheckCheck,
  XCircle,
} from 'lucide-react';

import { useToast } from '@/components/ToastProvider';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import StatCard from '@/components/ui/StatCard';
import EmptyState from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Select } from '@/components/ui/Select';

import AddExpertiseForm from './AddExpertiseForm';
import { deleteTutorExpertise, toggleTutorExpertise } from '../actions';
import s from './expertise.module.css';

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

interface Department {
  id: string;
  name: string;
}
interface Course {
  id: string;
  name: string;
  departmentId: string | null;
  department: Department | null;
}
export interface Expertise {
  id: string;
  tutorId: string;
  courseId: string;
  semesterCompleted: string;
  facultyName: string;
  courseGrade: string;
  availability: string;
  sessionFee: number;
  isActive: boolean;
  hideGrade: boolean;
  createdAt: Date | string;
  course: Course;
}

type StatusFilter = 'all' | 'active' | 'inactive';
type SortKey = 'recent' | 'alpha';

/* ------------------------------------------------------------------ *
 * Availability toggle — accessible switch with loading state.
 * Visually distinct on/off without relying on color alone (knob position
 * + inner check icon + aria-checked).
 * ------------------------------------------------------------------ */

function AvailabilityToggle({
  checked,
  loading,
  onChange,
  labelId,
}: {
  checked: boolean;
  loading: boolean;
  onChange: (next: boolean) => void;
  labelId: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      disabled={loading}
      onClick={() => onChange(!checked)}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        height: '1.5rem',
        width: '2.75rem',
        flexShrink: 0,
        borderRadius: 'var(--radius-full)',
        border: '2px solid transparent',
        cursor: loading ? 'progress' : 'pointer',
        transition: 'background-color var(--duration-base) var(--ease-standard)',
        backgroundColor: checked ? 'var(--success)' : 'var(--surface-4)',
      }}
      className={s.switchFocus}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: checked ? 'auto' : '0.125rem',
          right: checked ? '0.125rem' : 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '1.25rem',
          width: '1.25rem',
          borderRadius: 'var(--radius-full)',
          background: 'white',
          color: checked ? 'var(--success-hover)' : 'var(--surface-6)',
          boxShadow: 'var(--shadow-sm)',
          transition: 'left var(--duration-base) var(--ease-standard), right var(--duration-base) var(--ease-standard)',
        }}
      >
        {loading ? (
          <span
            className="animate-spin"
            style={{ width: '0.75rem', height: '0.75rem', borderRadius: 'var(--radius-full)', border: '2px solid currentColor', borderTopColor: 'transparent' }}
          />
        ) : checked ? (
          <CheckCircle2 size={14} strokeWidth={3} />
        ) : (
          <CircleDashed size={12} strokeWidth={2.5} />
        )}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * Small helper: a labelled metadata cell inside the card detail grid.
 * ------------------------------------------------------------------ */

function DetailCell({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.65rem',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-wide)',
          color: 'var(--text-muted)',
          marginBottom: '0.25rem',
        }}
      >
        {icon}
        {label}
      </span>
      <span
        style={{
          display: 'block',
          fontSize: 'var(--text-sm)',
          fontWeight: highlight ? 600 : 500,
          color: highlight ? 'var(--primary)' : 'var(--text-main)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Main dashboard
 * ------------------------------------------------------------------ */

export default function ExpertiseDashboard({
  expertises,
  allCourses,
}: {
  expertises: Expertise[];
  allCourses: { id: string; name: string }[];
}) {
  const { toast } = useToast();

  // UI state
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortKey, setSortKey] = useState<SortKey>('recent');
  const [deptFilter, setDeptFilter] = useState('');
  const [feeFilter, setFeeFilter] = useState('all');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Expertise | null>(null);

  // Bulk select state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const editingExpertise = expertises.find((e) => e.id === editingId) ?? null;
  const modalOpen = isAdding || editingId !== null;

  /* ----- derived departments for filter dropdown ------------------------- */
  const departments = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of expertises) {
      if (e.course?.department) {
        map.set(e.course.department.id, e.course.department.name);
      }
    }
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [expertises]);

  /* ----- derived summary stats ------------------------------------------- */

  const stats = useMemo(() => {
    const total = expertises.length;
    const active = expertises.filter((e) => e.isActive).length;
    const inactive = total - active;
    const categories = new Set(
      expertises.map((e) => e.course?.department?.name).filter(Boolean) as string[],
    ).size;
    const avgFee =
      total === 0
        ? 0
        : Math.round(expertises.reduce((sum, e) => sum + (e.sessionFee || 0), 0) / total);
    return { total, active, inactive, categories, avgFee };
  }, [expertises]);

  /* ----- filtered + sorted list ------------------------------------------ */

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = expertises.filter((e) => {
      if (statusFilter === 'active' && !e.isActive) return false;
      if (statusFilter === 'inactive' && e.isActive) return false;
      if (deptFilter && e.course?.department?.id !== deptFilter) return false;
      if (feeFilter === 'under500' && (e.sessionFee || 0) >= 500) return false;
      if (feeFilter === '500to1000' && ((e.sessionFee || 0) < 500 || (e.sessionFee || 0) > 1000)) return false;
      if (feeFilter === 'over1000' && (e.sessionFee || 0) <= 1000) return false;
      if (!q) return true;
      const haystack = [
        e.course?.name,
        e.course?.department?.name,
        e.facultyName,
        e.semesterCompleted,
        e.courseGrade,
        e.availability,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    list = list.slice().sort((a, b) => {
      if (sortKey === 'alpha') return (a.course?.name ?? '').localeCompare(b.course?.name ?? '');
      // recent: expertises already arrive desc by createdAt from the server;
      // keep stable order.
      return 0;
    });

    return list;
  }, [expertises, query, statusFilter, sortKey, deptFilter, feeFilter]);

  /* ----- bulk select helpers --------------------------------------------- */

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (prev.size === visible.length) return new Set();
      return new Set(visible.map((e) => e.id));
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleBulkToggle(targetActive: boolean) {
    const toToggle = expertises.filter(
      (e) => selectedIds.has(e.id) && e.isActive !== targetActive,
    );
    if (toToggle.length === 0) {
      clearSelection();
      return;
    }
    setBulkLoading(true);
    let ok = 0;
    for (const exp of toToggle) {
      const res = await toggleTutorExpertise(exp.id, targetActive);
      if (!res?.error) ok++;
    }
    setBulkLoading(false);
    clearSelection();
    toast.success(
      `${ok} expertise${ok === 1 ? '' : 's'} ${targetActive ? 'activated' : 'deactivated'}.`,
    );
  }

  /* ----- handlers --------------------------------------------------------- */

  async function handleToggle(exp: Expertise) {
    setTogglingId(exp.id);
    const res = await toggleTutorExpertise(exp.id, !exp.isActive);
    setTogglingId(null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(
        exp.isActive
          ? `${exp.course?.name ?? 'Expertise'} is now inactive.`
          : `${exp.course?.name ?? 'Expertise'} is now accepting students.`,
      );
    }
  }

  async function confirmDelete() {
    const exp = pendingDelete;
    if (!exp) return;
    setDeletingId(exp.id);
    const res = await deleteTutorExpertise(exp.id);
    setDeletingId(null);
    setPendingDelete(null);
    if (res?.error) {
      toast.error(res.error);
    } else {
      if (editingId === exp.id) setEditingId(null);
      toast.success('Expertise removed.');
    }
  }

  function closeModal() {
    setIsAdding(false);
    setEditingId(null);
  }

  /* ----- render ----------------------------------------------------------- */

  const isEmpty = expertises.length === 0;

  return (
    <div className="w-full">
      {/* ---------- Page header ---------- */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{ fontSize: 'var(--text-3xl)', marginBottom: 'var(--space-2)' }}>
            My Expertise
          </h1>
          <p style={{ color: 'var(--text-muted)', maxWidth: '42rem' }}>
            Manage the courses you offer to students. Update your availability anytime —
            inactive expertise stays on your profile but won&apos;t be shown to students
            looking for a tutor.
          </p>
        </div>
        {!isEmpty && (
          <Button onClick={() => setIsAdding(true)} className={s.addCtaMobile}>
            <Plus size={18} aria-hidden="true" />
            Add Expertise
          </Button>
        )}
      </div>

      {isEmpty ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="No expertise yet"
          description="Add the first course you can teach. Students searching for help in that course will see your profile, your grade, and your availability — and request sessions with you directly."
          action={
            <Button onClick={() => setIsAdding(true)}>
              <Plus size={18} aria-hidden="true" />
              Add your first expertise
            </Button>
          }
        />
      ) : (
        <>
          {/* ---------- Summary cards ---------- */}
          <div
            className="stat-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-8)',
            }}
          >
            <StatCard title="Total Expertise" value={stats.total} icon={<Layers size={20} />} />
            <StatCard title="Active" value={stats.active} icon={<CheckCircle2 size={20} />} />
            <StatCard title="Inactive" value={stats.inactive} icon={<CircleDashed size={20} />} />
            <StatCard title="Departments" value={stats.categories} icon={<Tag size={20} />} />
          </div>

          {/* ---------- Toolbar: search + filters ---------- */}
          <div className={s.toolbar} style={{ marginBottom: 'var(--space-4)' }}>
            <div className="search-wrap" style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <label htmlFor="expertise-search" className="sr-only">
                Search expertise
              </label>
              <Search
                size={18}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 'var(--space-3)',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="expertise-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by course, faculty, department…"
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>

            <div className={s.filterGroup} role="group" aria-label="Filter and sort expertise">
              <label className={s.filterChip}>
                <input
                  type="radio"
                  name="status"
                  value="all"
                  checked={statusFilter === 'all'}
                  onChange={() => setStatusFilter('all')}
                  className="sr-only"
                />
                <span>All</span>
              </label>
              <label className={s.filterChip}>
                <input
                  type="radio"
                  name="status"
                  value="active"
                  checked={statusFilter === 'active'}
                  onChange={() => setStatusFilter('active')}
                  className="sr-only"
                />
                <span>Active</span>
              </label>
              <label className={s.filterChip}>
                <input
                  type="radio"
                  name="status"
                  value="inactive"
                  checked={statusFilter === 'inactive'}
                  onChange={() => setStatusFilter('inactive')}
                  className="sr-only"
                />
                <span>Inactive</span>
              </label>

              <Select
                label="Sort expertise"
                hideLabel
                containerClassName={s.sortSelect}
                value={sortKey}
                onChange={(v) => setSortKey(v as SortKey)}
                options={[
                  { value: 'recent', label: 'Recently added' },
                  { value: 'alpha', label: 'Alphabetical' },
                ]}
              />

              {departments.length > 1 && (
                <Select
                  label="Filter by department"
                  hideLabel
                  containerClassName={s.sortSelect}
                  value={deptFilter}
                  onChange={setDeptFilter}
                  placeholderOption="All departments"
                  options={departments.map((d) => ({ value: d.id, label: d.name }))}
                />
              )}

              <Select
                label="Filter by fee"
                hideLabel
                containerClassName={s.sortSelect}
                value={feeFilter}
                onChange={setFeeFilter}
                options={[
                  { value: 'all', label: 'Any fee' },
                  { value: 'under500', label: 'Under 500 BDT' },
                  { value: '500to1000', label: '500 – 1,000 BDT' },
                  { value: 'over1000', label: 'Over 1,000 BDT' },
                ]}
              />
            </div>
          </div>

          {/* ---------- Bulk action bar ---------- */}
          {selectedIds.size > 0 && (
            <div
              className={s.bulkBar}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                padding: 'var(--space-2) var(--space-4)',
                marginBottom: 'var(--space-3)',
                borderRadius: 'var(--radius-md)',
                background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
                border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                {selectedIds.size} selected
              </span>
              <div style={{ display: 'flex', gap: 'var(--space-2)', marginLeft: 'auto', flexWrap: 'wrap' }}>
                <Button
                  size="sm"
                  onClick={() => handleBulkToggle(true)}
                  loading={bulkLoading}
                >
                  <Power size={14} aria-hidden="true" />
                  Activate
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkToggle(false)}
                  loading={bulkLoading}
                >
                  <Power size={14} aria-hidden="true" />
                  Deactivate
                </Button>
                <Button size="sm" variant="secondary" onClick={clearSelection} disabled={bulkLoading}>
                  <XCircle size={14} aria-hidden="true" />
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* ---------- List ---------- */}
          {visible.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: 'var(--space-4)' }}>
                No expertise matches your filters.
              </p>
              <Button
                variant="secondary"
                onClick={() => {
                  setQuery('');
                  setStatusFilter('all');
                }}
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <>
            {/* Select all bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-3)',
                padding: '0 var(--space-2)',
              }}
            >
              <button
                type="button"
                onClick={toggleSelectAll}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: 'var(--text-muted)',
                  padding: '0.25rem 0',
                }}
              >
                {selectedIds.size === visible.length && visible.length > 0 ? (
                  <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                ) : (
                  <Square size={18} />
                )}
                {selectedIds.size === visible.length && visible.length > 0
                  ? `All ${visible.length} selected`
                  : 'Select all'}
              </button>
            </div>
            <ul
              className="expertise-list"
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-4)',
                margin: 0,
                padding: 0,
              }}
            >
              {visible.map((exp) => {
                const inactive = !exp.isActive;
                const switching = togglingId === exp.id;
                const gradeLabel = exp.hideGrade ? 'Hidden' : exp.courseGrade;
                const dept = exp.course?.department?.name;
                const toggleLabelId = `avail-label-${exp.id}`;
                const updated = new Date(exp.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <li
                    key={exp.id}
                    className={`card expertise-card${inactive ? ' is-inactive' : ''}`}
                    style={{
                      padding: 'var(--space-5)',
                      borderLeft: inactive
                        ? undefined
                        : `4px solid var(--primary)`,
                      opacity: inactive ? 0.85 : 1,
                      transition: 'opacity var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)',
                    }}
                  >
                    {/* Selection checkbox — top-left, before title row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <button
                        type="button"
                        onClick={() => toggleSelect(exp.id)}
                        aria-label={`Select ${exp.course?.name ?? 'expertise'}`}
                        aria-pressed={selectedIds.has(exp.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'inline-flex' }}
                      >
                        {selectedIds.has(exp.id) ? (
                          <CheckSquare size={18} style={{ color: 'var(--primary)' }} />
                        ) : (
                          <Square size={18} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </button>
                    </div>

                    {/* Row 1: title + status + toggle */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            flexWrap: 'wrap',
                            marginBottom: '0.25rem',
                          }}
                        >
                          <h2
                            style={{
                              fontSize: 'var(--text-lg)',
                              fontWeight: 700,
                              color: 'var(--text-main)',
                              margin: 0,
                            }}
                          >
                            {exp.course?.name ?? 'Unknown course'}
                          </h2>
                          {dept && <Badge tone="info">{dept}</Badge>}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            color: 'var(--text-muted)',
                            fontSize: 'var(--text-sm)',
                          }}
                        >
                          {inactive ? (
                            <Badge tone="neutral">
                              <Power size={12} aria-hidden="true" /> Inactive
                            </Badge>
                          ) : (
                            <Badge tone="success">
                              <CheckCircle2 size={12} aria-hidden="true" /> Accepting students
                            </Badge>
                          )}
                          <span aria-hidden="true">·</span>
                          <span>Added {updated}</span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-3)',
                          flexShrink: 0,
                        }}
                      >
                        <span
                          id={toggleLabelId}
                          className="sr-only"
                        >
                          Availability for {exp.course?.name}
                        </span>
                        <AvailabilityToggle
                          checked={exp.isActive}
                          loading={switching}
                          onChange={() => handleToggle(exp)}
                          labelId={toggleLabelId}
                        />
                      </div>
                    </div>

                    {/* Row 2: detail grid */}
                    <div
                      className="detail-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        backgroundColor: 'var(--surface-1)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        marginBottom: 'var(--space-4)',
                      }}
                    >
                      <DetailCell
                        icon={<GraduationCap size={12} />}
                        label="Grade"
                        value={gradeLabel}
                      />
                      <DetailCell icon={<User size={12} />} label="Faculty" value={exp.facultyName} />
                      <DetailCell
                        icon={<BookOpen size={12} />}
                        label="Semester"
                        value={exp.semesterCompleted}
                      />
                      <DetailCell
                        icon={<Clock size={12} />}
                        label="Availability"
                        value={exp.availability}
                      />
                      <DetailCell
                        icon={<Tag size={12} />}
                        label="Fee / Session"
                        value={`${exp.sessionFee.toLocaleString()} BDT`}
                        highlight
                      />
                    </div>

                    {/* Row 3: actions */}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 'var(--space-2)',
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setEditingId(exp.id)}
                      >
                        <Pencil size={14} aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPendingDelete(exp)}
                        loading={deletingId === exp.id}
                        className={s.deleteBtn}
                      >
                        <Trash2 size={14} aria-hidden="true" />
                        Delete
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
            </>
          )}
        </>
      )}

      {/* ---------- Add / Edit Sheet ---------- */}
      <Sheet
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Edit Expertise' : 'Add New Expertise'}
        size="36rem"
      >
        {editingId && editingExpertise ? (
          <AddExpertiseForm
            courses={allCourses}
            initialData={editingExpertise}
            onSuccess={() => setEditingId(null)}
            onCancel={closeModal}
          />
        ) : (
          <AddExpertiseForm
            courses={allCourses}
            onSuccess={() => setIsAdding(false)}
            onCancel={closeModal}
          />
        )}
      </Sheet>

      {/* ---------- Delete confirmation ---------- */}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete this expertise?"
        tone="danger"
        confirmLabel="Delete"
        loading={deletingId !== null}
        onConfirm={confirmDelete}
        onClose={() => (deletingId === null ? setPendingDelete(null) : undefined)}
        description={
          pendingDelete ? (
            <>
              <strong>{pendingDelete.course?.name}</strong> will be removed from your profile.
              Students will no longer be able to request you for this course. This cannot be
              undone.
            </>
          ) : null
        }
      />
    </div>
  );
}
