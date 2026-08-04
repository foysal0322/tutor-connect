'use client';

import { useMemo, useState } from 'react';
import { updateTutorExpertise, deleteTutorExpertise } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { formatBDT } from '@/lib/format';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { KPI } from '@/components/ui/KPI';
import EmptyState from '@/components/ui/EmptyState';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useDebounce } from '@/hooks/useDebounce';
import { Pencil, Trash2, Layers, Eye, EyeOff, Search } from 'lucide-react';

type Course = { id: string; name: string };

type Expertise = {
  id: string;
  tutorId: string;
  courseId: string;
  semesterCompleted: string;
  facultyName: string;
  courseGrade: string;
  availability: string;
  sessionFee: number;
  hideGrade: boolean;
  isActive: boolean;
  tutor: { name: string; nsuId: string };
  course: { name: string };
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function ExpertiseManager({
  expertises,
  courses,
}: {
  expertises: Expertise[];
  courses: Course[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'HIDDEN'>('ALL');
  const { confirm, dialog: confirmDialog } = useConfirmDialog();
  const debouncedSearch = useDebounce(searchQuery, 300);

  const filteredExpertises = useMemo(() => {
    let result = [...expertises];
    if (statusFilter === 'ACTIVE') result = result.filter((e) => e.isActive);
    if (statusFilter === 'HIDDEN') result = result.filter((e) => !e.isActive);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (e) =>
          e.tutor.name.toLowerCase().includes(q) ||
          e.tutor.nsuId.toLowerCase().includes(q) ||
          e.course.name.toLowerCase().includes(q) ||
          e.facultyName.toLowerCase().includes(q),
      );
    }
    return result;
  }, [expertises, debouncedSearch, statusFilter]);

  // KPIs (cheap, client-side)
  const total = expertises.length;
  const activeCount = expertises.filter((e) => e.isActive).length;
  const hiddenCount = total - activeCount;
  const avgFee = total
    ? Math.round(expertises.reduce((s, e) => s + e.sessionFee, 0) / total)
    : 0;

  async function handleEdit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await updateTutorExpertise(formData);
    if (res?.error) setError(res.error);
    else {
      setSuccess('Expertise updated.');
      setEditingId(null);
    }
    setLoading(false);
  }

  async function handleDelete(exp: Expertise) {
    const ok = await confirm({
      title: 'Delete this expertise?',
      description: `${exp.tutor.name} → ${exp.course.name} will be removed permanently.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await deleteTutorExpertise(exp.id);
    if (res?.error) setError(res.error);
    else setSuccess('Expertise deleted.');
    setLoading(false);
  }

  const courseOptions = courses.map((c) => ({ value: c.id, label: c.name }));

  function renderEditForm(exp: Expertise, layout: 'grid' | 'stacked') {
    return (
      <form action={handleEdit} style={layout === 'grid' ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-3)',
        padding: 'var(--space-2)',
      } : { display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        <input type='hidden' name='id' value={exp.id} />
        <div style={layout === 'grid' ? { gridColumn: 'span 2' } : undefined}>
          <Select
            containerClassName={fieldClass}
            name='courseId'
            label='Course'
            searchable
            defaultValue={exp.courseId}
            options={courseOptions}
          />
        </div>
        <Input
          containerClassName={fieldClass}
          name='sessionFee'
          type='number'
          step='any'
          min='0'
          label='Session Fee (BDT)'
          defaultValue={exp.sessionFee}
        />
        <Input
          containerClassName={fieldClass}
          name='facultyName'
          label='Faculty Name'
          defaultValue={exp.facultyName}
          required
        />
        <Input
          containerClassName={fieldClass}
          name='courseGrade'
          label='Course Grade'
          defaultValue={exp.courseGrade}
          required
        />
        <Input
          containerClassName={fieldClass}
          name='semesterCompleted'
          label='Semester Completed'
          defaultValue={exp.semesterCompleted}
        />
        <Input
          containerClassName={fieldClass}
          name='availability'
          label='Availability'
          defaultValue={exp.availability}
        />
        <div
          style={{
            gridColumn: layout === 'grid' ? 'span 3' : undefined,
            display: 'flex',
            gap: 'var(--space-4)',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <input type='checkbox' name='hideGrade' defaultChecked={exp.hideGrade} style={{ width: 16, height: 16 }} />
            Hide grade from students
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
            <input type='checkbox' name='isActive' defaultChecked={exp.isActive} style={{ width: 16, height: 16 }} />
            Active
          </label>
        </div>
        <div style={{ gridColumn: layout === 'grid' ? 'span 3' : undefined, display: 'flex', gap: 'var(--space-2)' }}>
          <FormSubmit fullWidth={false} loading={loading} loadingText='Saving…'>
            Save
          </FormSubmit>
          <button
            type='button'
            onClick={() => setEditingId(null)}
            className='btn btn-secondary'
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {confirmDialog}
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone='success'>{success}</FormAlert>}

      <PageHeader
        icon={<Layers size={18} aria-hidden='true' />}
        title='Course Expertises'
        subtitle='Every tutor→course pairing on the platform. Edit fees, faculty, availability, grade visibility, or active status inline. Hidden rows remain editable here so they can be reactivated.'
      />

      {/* KPI Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 'var(--space-3)',
        }}
      >
        <KPI
          label='Total'
          value={total.toLocaleString()}
          icon={<Layers size={16} aria-hidden='true' />}
          tone='info'
          variant='accent'
        />
        <KPI
          label='Active'
          value={activeCount.toLocaleString()}
          icon={<Eye size={16} aria-hidden='true' />}
          tone='success'
          variant='accent'
        />
        <KPI
          label='Hidden'
          value={hiddenCount.toLocaleString()}
          icon={<EyeOff size={16} aria-hidden='true' />}
          tone={hiddenCount > 0 ? 'accent' : 'neutral'}
          variant='accent'
        />
        <KPI
          label='Avg Fee'
          value={`${formatBDT(avgFee)} BDT`}
          tone='primary'
          variant='accent'
          hint='Across all expertises'
        />
      </div>

      <section
        className='card'
        style={{ padding: 0, overflow: 'hidden' }}
        aria-label='Tutor course expertises'
      >
        <Toolbar
          search={
            <div style={{ position: 'relative', minWidth: 240, flex: 1 }}>
              <Search
                size={16}
                aria-hidden='true'
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
                type='text'
                aria-label='Search by tutor, course, or faculty'
                placeholder='Search by tutor, course, or faculty…'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  paddingLeft: 'calc(var(--space-3) + 20px)',
                  paddingRight: 'var(--space-3)',
                  paddingTop: 'var(--space-2)',
                  paddingBottom: 'var(--space-2)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'var(--input-bg)',
                  color: 'var(--text-main)',
                  fontSize: 'var(--text-sm)',
                  outline: 'none',
                }}
              />
            </div>
          }
          filters={
            <div
              role='radiogroup'
              aria-label='Filter by status'
              style={{
                display: 'inline-flex',
                gap: 2,
                background: 'var(--surface-2)',
                padding: 2,
                borderRadius: 'var(--radius-md)',
              }}
            >
              {([
                { value: 'ALL', label: 'All' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'HIDDEN', label: 'Hidden' },
              ] as const).map((opt) => {
                const active = statusFilter === opt.value;
                return (
                  <button
                    key={opt.value}
                    type='button'
                    role='radio'
                    aria-checked={active}
                    onClick={() => setStatusFilter(opt.value)}
                    style={{
                      border: 'none',
                      background: active ? 'var(--card-bg)' : 'transparent',
                      color: active ? 'var(--text-main)' : 'var(--text-muted)',
                      fontWeight: active ? 600 : 500,
                      cursor: 'pointer',
                      padding: '6px 12px',
                      borderRadius: 'calc(var(--radius-md) - 2px)',
                      fontSize: 'var(--text-xs)',
                      boxShadow: active ? 'var(--shadow-sm)' : 'none',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          }
          actions={
            <span
              style={{
                fontSize: 'var(--text-xs)',
                color: 'var(--text-muted)',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {filteredExpertises.length} shown
            </span>
          }
        />

        <div className='data-grid-container'>
          {filteredExpertises.length === 0 ? (
            <EmptyState
              icon={<Layers size={32} aria-hidden='true' />}
              title={searchQuery || statusFilter !== 'ALL' ? 'No expertises match your filters' : 'No expertises yet'}
              description={
                searchQuery || statusFilter !== 'ALL'
                  ? 'Try a different search or clear the status filter.'
                  : 'When tutors claim course expertises they will appear here.'
              }
            />
          ) : (
            <>
              {/* Desktop / tablet table */}
              <table className='data-grid' style={{ display: 'table' }}>
                <thead>
                  <tr>
                    <th style={{ width: '22%' }}>Tutor</th>
                    <th style={{ width: '22%' }}>Course</th>
                    <th style={{ width: '16%' }}>Faculty / Grade</th>
                    <th style={{ width: '14%' }}>Availability</th>
                    <th style={{ width: '10%', textAlign: 'right' }}>Fee</th>
                    <th style={{ width: '8%' }}>Status</th>
                    <th style={{ width: 100, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpertises.map((exp) => {
                    const isEditing = editingId === exp.id;
                    return (
                      <tr key={exp.id} style={{ opacity: exp.isActive ? 1 : 0.6 }}>
                        {isEditing ? (
                          <td colSpan={7}>{renderEditForm(exp, 'grid')}</td>
                        ) : (
                          <>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span
                                  aria-hidden='true'
                                  style={{
                                    flexShrink: 0,
                                    width: 28,
                                    height: 28,
                                    borderRadius: 'var(--radius-full)',
                                    background: 'var(--primary-light)',
                                    color: 'var(--primary)',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: 10,
                                    fontWeight: 700,
                                  }}
                                >
                                  {initials(exp.tutor.name)}
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{exp.tutor.name}</div>
                                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{exp.tutor.nsuId}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontWeight: 500, color: 'var(--text-main)' }}>{exp.course.name}</td>
                            <td>
                              <div style={{ fontSize: 'var(--text-sm)' }}>{exp.facultyName}</div>
                              <span
                                className={`badge badge-primary ${exp.hideGrade ? 'opacity-50' : ''}`}
                                style={{ fontSize: 10 }}
                              >
                                {exp.courseGrade}
                                {exp.hideGrade ? ' · hidden' : ''}
                              </span>
                            </td>
                            <td style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                              {exp.availability || '—'}
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: 600,
                                color: 'var(--primary)',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {formatBDT(exp.sessionFee)}
                              <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}> BDT</span>
                            </td>
                            <td>
                              <span className={`badge ${exp.isActive ? 'badge-success' : 'badge-warning'}`}>
                                {exp.isActive ? 'Active' : 'Hidden'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                                <button
                                  type='button'
                                  onClick={() => setEditingId(exp.id)}
                                  disabled={loading}
                                  className='btn btn-secondary btn-sm'
                                  aria-label={`Edit ${exp.tutor.name}'s expertise`}
                                  title='Edit'
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                >
                                  <Pencil size={12} aria-hidden='true' />
                                  Edit
                                </button>
                                <button
                                  type='button'
                                  onClick={() => handleDelete(exp)}
                                  disabled={loading}
                                  className='btn btn-danger btn-sm'
                                  aria-label={`Delete ${exp.tutor.name}'s expertise`}
                                  title='Delete'
                                >
                                  <Trash2 size={12} aria-hidden='true' />
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div
                className='md:hidden'
                style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-color)' }}
              >
                {filteredExpertises.map((exp) => {
                  const isEditing = editingId === exp.id;
                  return (
                    <div
                      key={exp.id}
                      style={{
                        background: 'var(--card-bg)',
                        padding: 'var(--space-3)',
                        opacity: exp.isActive ? 1 : 0.7,
                      }}
                    >
                      {isEditing ? (
                        renderEditForm(exp, 'stacked')
                      ) : (
                        <>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                            <span
                              aria-hidden='true'
                              style={{
                                flexShrink: 0,
                                width: 32,
                                height: 32,
                                borderRadius: 'var(--radius-full)',
                                background: 'var(--primary-light)',
                                color: 'var(--primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {initials(exp.tutor.name)}
                            </span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{exp.tutor.name}</span>
                                <span className={`badge ${exp.isActive ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                                  {exp.isActive ? 'Active' : 'Hidden'}
                                </span>
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                                {exp.tutor.nsuId}
                              </div>
                              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-main)', marginTop: 'var(--space-1)', fontWeight: 500 }}>
                                {exp.course.name}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                {exp.facultyName} · Grade {exp.courseGrade}
                                {exp.hideGrade ? ' (hidden)' : ''}
                                {exp.availability ? ` · ${exp.availability}` : ''}
                              </div>
                              <div
                                style={{
                                  marginTop: 'var(--space-2)',
                                  fontSize: 'var(--text-base)',
                                  fontWeight: 700,
                                  color: 'var(--primary)',
                                  fontVariantNumeric: 'tabular-nums',
                                }}
                              >
                                {formatBDT(exp.sessionFee)} <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>BDT</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-3)' }}>
                            <button
                              type='button'
                              onClick={() => setEditingId(exp.id)}
                              disabled={loading}
                              className='btn btn-secondary btn-sm'
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}
                            >
                              <Pencil size={12} aria-hidden='true' />
                              Edit
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDelete(exp)}
                              disabled={loading}
                              className='btn btn-danger btn-sm'
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}
                            >
                              <Trash2 size={12} aria-hidden='true' />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
