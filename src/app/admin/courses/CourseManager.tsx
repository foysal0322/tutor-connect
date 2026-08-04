'use client';

import { useState, useRef, useMemo } from 'react';
import { addCourse, updateCourse, deleteCourse, importCourses, deleteBulkCourses } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { KPI } from '@/components/ui/KPI';
import EmptyState from '@/components/ui/EmptyState';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Upload, Trash2, Search, BookOpen, Layers, CheckSquare, Plus, Pencil } from 'lucide-react';

// NOTE: This table is not migrated to <DataGrid>. It needs (a) row-level
// multi-select with a "select all on page" affordance, (b) inline row editing,
// and (c) bulk-delete on the selection. None of these are expressible through
// DataGrid's current column/cell API without substantial new features.

export default function CourseManager({ courses }: { courses: any[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Add/Import toggles
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    return courses.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [courses, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / itemsPerPage));
  const currentCourses = filteredCourses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );

  async function handleAdd(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await addCourse(formData);
    if (res?.error) setError(res.error);
    else {
      (document.getElementById('add-course-form') as HTMLFormElement).reset();
      setSuccess('Course added successfully!');
      setShowAdd(false);
    }
    setLoading(false);
  }

  async function handleEdit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await updateCourse(formData);
    if (res?.error) setError(res.error);
    else {
      setSuccess('Course updated.');
      setEditingId(null);
    }
    setLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    const ok = await confirm({
      title: 'Delete this course?',
      description: `"${name}" will be removed permanently. Tutors who listed this course as an expertise will need to pick a new one.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await deleteCourse(id);
    if (res?.error) setError(res.error);
    else {
      setSuccess('Course deleted.');
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setLoading(false);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    const ok = await confirm({
      title: `Delete ${selectedIds.size} courses?`,
      description:
        'All selected courses will be removed permanently. Tutors who listed any of these as an expertise will need to pick new ones.',
      confirmLabel: `Delete ${selectedIds.size}`,
      tone: 'danger',
    });
    if (!ok) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const res = await deleteBulkCourses(Array.from(selectedIds));
    if (res?.error) setError(res.error);
    else {
      setSuccess(`Deleted ${selectedIds.size} courses.`);
      setSelectedIds(new Set());
    }
    setLoading(false);
  }

  async function handleImport() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Please select a JSON file.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!Array.isArray(parsed)) throw new Error('JSON root must be an array');

        const mappedCourses = parsed.map((c) => {
          if (!c.courseCode || !c.courseName) throw new Error('Missing courseCode or courseName in JSON');
          return { name: `${c.courseCode}: ${c.courseName}` };
        });

        const res = await importCourses(mappedCourses);
        if (res?.error) setError(res.error);
        else {
          setSuccess(`Imported ${mappedCourses.length} courses.`);
          if (fileInputRef.current) fileInputRef.current.value = '';
          setShowImport(false);
        }
      } catch (err) {
        setError('Failed to parse JSON file: ' + (err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
      setLoading(false);
    };
    reader.readAsText(file);
  }

  function handleSelectAll(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.checked) {
      const next = new Set(selectedIds);
      currentCourses.forEach((c) => next.add(c.id));
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      currentCourses.forEach((c) => next.delete(c.id));
      setSelectedIds(next);
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    if (checked) next.add(id);
    else next.delete(id);
    setSelectedIds(next);
  }

  const isAllCurrentSelected =
    currentCourses.length > 0 && currentCourses.every((c) => selectedIds.has(c.id));
  const someCurrentSelected = currentCourses.some((c) => selectedIds.has(c.id));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
      {confirmDialog}
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone='success'>{success}</FormAlert>}

      <PageHeader
        icon={<BookOpen size={18} aria-hidden='true' />}
        title='Course Catalog'
        subtitle='Manage the list of courses tutors can claim expertise in. Add courses individually, import a batch via JSON, or edit existing entries inline.'
        actions={
          <>
            <button
              type='button'
              onClick={() => {
                setShowImport((v) => !v);
                setShowAdd(false);
              }}
              className='btn btn-secondary btn-sm'
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              aria-expanded={showImport}
            >
              <Upload size={14} aria-hidden='true' />
              Import JSON
            </button>
            <button
              type='button'
              onClick={() => {
                setShowAdd((v) => !v);
                setShowImport(false);
              }}
              className='btn btn-primary btn-sm'
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              aria-expanded={showAdd}
            >
              <Plus size={14} aria-hidden='true' />
              Add Course
            </button>
          </>
        }
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
          label='Total Courses'
          value={courses.length.toLocaleString()}
          icon={<BookOpen size={16} aria-hidden='true' />}
          tone='primary'
          variant='accent'
        />
        <KPI
          label='Filtered'
          value={filteredCourses.length.toLocaleString()}
          icon={<Search size={16} aria-hidden='true' />}
          tone='info'
          variant='accent'
          hint={searchQuery ? 'Matching search' : 'No filter applied'}
        />
        <KPI
          label='Selected'
          value={selectedIds.size.toLocaleString()}
          icon={<CheckSquare size={16} aria-hidden='true' />}
          tone={selectedIds.size > 0 ? 'danger' : 'neutral'}
          variant='accent'
          hint={selectedIds.size > 0 ? 'Ready for bulk delete' : 'Nothing selected'}
        />
        <KPI
          label='Pages'
          value={`${currentPage} / ${totalPages}`}
          icon={<Layers size={16} aria-hidden='true' />}
          tone='neutral'
          variant='accent'
          hint={`${itemsPerPage} per page`}
        />
      </div>

      {/* Add Course panel */}
      {showAdd && (
        <section className='card' aria-label='Add course'>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}
          >
            <h2
              style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}
            >
              Add Course
            </h2>
            <button
              type='button'
              onClick={() => setShowAdd(false)}
              className='btn btn-ghost btn-sm'
              aria-label='Close add panel'
            >
              ✕
            </button>
          </header>
          <form id='add-course-form' action={handleAdd} className='flex flex-col gap-3'>
            <Input
              containerClassName={fieldClass}
              name='name'
              type='text'
              label='Course Name (e.g. ACT201: Intro…)'
              required
              placeholder='CSE115: Programming Fundamentals'
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <FormSubmit fullWidth={false} loading={loading} loadingText='Adding…'>
                Add Course
              </FormSubmit>
              <button
                type='button'
                onClick={() => setShowAdd(false)}
                className='btn btn-secondary'
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Import panel */}
      {showImport && (
        <section className='card' aria-label='Import courses from JSON'>
          <header
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-3)',
            }}
          >
            <h2
              style={{ margin: 0, fontSize: 'var(--text-base)', fontWeight: 700 }}
            >
              Import Courses via JSON
            </h2>
            <button
              type='button'
              onClick={() => setShowImport(false)}
              className='btn btn-ghost btn-sm'
              aria-label='Close import panel'
            >
              ✕
            </button>
          </header>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: '0 0 var(--space-3) 0' }}>
            JSON must be an array of <code>{'[{ "courseCode": "CSE115", "courseName": "Programming I" }]'}</code>.
          </p>
          <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
            <input
              type='file'
              accept='.json'
              ref={fileInputRef}
              className='block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-indigo-100 cursor-pointer'
            />
            <button
              type='button'
              onClick={handleImport}
              className='btn btn-primary'
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
              disabled={loading}
            >
              <Upload size={16} aria-hidden='true' />
              Import Courses
            </button>
          </div>
        </section>
      )}

      {/* Courses table */}
      <section
        className='card'
        style={{ padding: 0, overflow: 'hidden' }}
        aria-label='Courses'
      >
        <Toolbar
          search={
            <div style={{ position: 'relative', minWidth: 220, flex: 1 }}>
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
                aria-label='Search courses'
                placeholder='Search courses…'
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
          actions={
            selectedIds.size > 0 ? (
              <button
                type='button'
                onClick={handleBulkDelete}
                className='btn btn-danger btn-sm'
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                disabled={loading}
              >
                <Trash2 size={14} aria-hidden='true' />
                Delete Selected ({selectedIds.size})
              </button>
            ) : null
          }
        />

        <div className='data-grid-container'>
          {currentCourses.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={32} aria-hidden='true' />}
              title={searchQuery ? 'No courses match your search' : 'No courses yet'}
              description={
                searchQuery
                  ? 'Try a different course code or name.'
                  : 'Click "Add Course" above to create the first one.'
              }
            />
          ) : (
            <>
              {/* Desktop / tablet table */}
              <table className='data-grid' style={{ display: 'table' }}>
                <thead>
                  <tr>
                    <th style={{ width: 48, textAlign: 'center' }}>
                      <input
                        type='checkbox'
                        checked={isAllCurrentSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = !isAllCurrentSelected && someCurrentSelected;
                        }}
                        onChange={handleSelectAll}
                        disabled={currentCourses.length === 0}
                        aria-label='Select all on page'
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </th>
                    <th>Course Name</th>
                    <th style={{ width: 160, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentCourses.map((course) => (
                    <tr
                      key={course.id}
                      style={{
                        background: selectedIds.has(course.id) ? 'var(--primary-light)' : undefined,
                      }}
                    >
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type='checkbox'
                          checked={selectedIds.has(course.id)}
                          onChange={(e) => handleSelectOne(course.id, e.target.checked)}
                          aria-label={`Select ${course.name}`}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td colSpan={editingId === course.id ? 2 : 1}>
                        {editingId === course.id ? (
                          <form action={handleEdit} style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <input type='hidden' name='id' value={course.id} />
                            <div style={{ flex: 1, minWidth: 220 }}>
                              <Input
                                containerClassName={fieldClass}
                                name='name'
                                type='text'
                                defaultValue={course.name}
                                label='Course Name'
                                required
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
                        ) : (
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                            {course.name}
                          </div>
                        )}
                      </td>
                      {editingId !== course.id && (
                        <td>
                          <div style={{ display: 'flex', gap: 'var(--space-1)', justifyContent: 'flex-end' }}>
                            <button
                              type='button'
                              onClick={() => setEditingId(course.id)}
                              className='btn btn-secondary btn-sm'
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                              disabled={loading}
                              aria-label={`Edit ${course.name}`}
                            >
                              <Pencil size={12} aria-hidden='true' />
                              Edit
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDelete(course.id, course.name)}
                              className='btn btn-danger btn-sm'
                              disabled={loading}
                              aria-label={`Delete ${course.name}`}
                            >
                              <Trash2 size={12} aria-hidden='true' />
                              Delete
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div
                className='md:hidden'
                style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border-color)' }}
              >
                <div
                  style={{
                    background: 'var(--card-bg)',
                    padding: 'var(--space-2) var(--space-3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                  }}
                >
                  <input
                    type='checkbox'
                    checked={isAllCurrentSelected}
                    onChange={handleSelectAll}
                    aria-label='Select all on page'
                    style={{ cursor: 'pointer', width: 18, height: 18 }}
                  />
                  <label
                    style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      flex: 1,
                    }}
                  >
                    Select All on Page
                  </label>
                  {selectedIds.size > 0 && (
                    <button
                      type='button'
                      onClick={handleBulkDelete}
                      className='btn btn-danger btn-sm'
                      disabled={loading}
                      style={{ fontSize: 11 }}
                    >
                      <Trash2 size={12} aria-hidden='true' /> {selectedIds.size}
                    </button>
                  )}
                </div>
                {currentCourses.map((course) => (
                  <div
                    key={course.id}
                    style={{
                      background: selectedIds.has(course.id) ? 'var(--primary-light)' : 'var(--card-bg)',
                      padding: 'var(--space-3)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-3)',
                    }}
                  >
                    <input
                      type='checkbox'
                      checked={selectedIds.has(course.id)}
                      onChange={(e) => handleSelectOne(course.id, e.target.checked)}
                      aria-label={`Select ${course.name}`}
                      style={{ cursor: 'pointer', width: 18, height: 18, marginTop: 2 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === course.id ? (
                        <form action={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          <input type='hidden' name='id' value={course.id} />
                          <Input
                            containerClassName={fieldClass}
                            name='name'
                            type='text'
                            defaultValue={course.name}
                            label='Course Name'
                            required
                          />
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
                      ) : (
                        <>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: 'var(--text-sm)' }}>
                            {course.name}
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-1)', marginTop: 'var(--space-2)' }}>
                            <button
                              type='button'
                              onClick={() => setEditingId(course.id)}
                              className='btn btn-secondary btn-sm'
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}
                              disabled={loading}
                            >
                              <Pencil size={12} aria-hidden='true' />
                              Edit
                            </button>
                            <button
                              type='button'
                              onClick={() => handleDelete(course.id, course.name)}
                              className='btn btn-danger btn-sm'
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flex: 1, justifyContent: 'center' }}
                              disabled={loading}
                            >
                              <Trash2 size={12} aria-hidden='true' />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-3)',
                    borderTop: '1px solid var(--border-color)',
                  }}
                >
                  <button
                    type='button'
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className='btn btn-secondary btn-sm'
                  >
                    Previous
                  </button>
                  <span
                    style={{
                      fontSize: 'var(--text-xs)',
                      color: 'var(--text-muted)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type='button'
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className='btn btn-secondary btn-sm'
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
