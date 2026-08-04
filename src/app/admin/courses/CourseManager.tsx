'use client';

import { useState, useRef, useMemo } from 'react';
import { addCourse, updateCourse, deleteCourse, importCourses, deleteBulkCourses } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toolbar } from '@/components/ui/Toolbar';
import { KPI } from '@/components/ui/KPI';
import DataGrid, { type ColumnDef, type RowAction } from '@/components/ui/DataGrid';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Upload, Trash2, Search, BookOpen, Layers, CheckSquare, Plus, Pencil } from 'lucide-react';

type Course = { id: string; name: string };

export default function CourseManager({ courses }: { courses: Course[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Search (external Toolbar drives the filter; DataGrid consumes the result).
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection — controlled string[] to match DataGrid's API.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Add/Import toggles
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    return courses.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [courses, searchQuery]);

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
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
    setLoading(false);
  }

  async function handleBulkDelete() {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    const ok = await confirm({
      title: `Delete ${count} courses?`,
      description:
        'All selected courses will be removed permanently. Tutors who listed any of these as an expertise will need to pick new ones.',
      confirmLabel: `Delete ${count}`,
      tone: 'danger',
    });
    if (!ok) return;

    setLoading(true);
    setError('');
    setSuccess('');

    const res = await deleteBulkCourses(selectedIds);
    if (res?.error) setError(res.error);
    else {
      setSuccess(`Deleted ${count} courses.`);
      setSelectedIds([]);
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

  const columns: ColumnDef<Course>[] = [
    {
      header: 'Course Name',
      accessorKey: 'name',
      cell: (c) => <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{c.name}</span>,
    },
  ];

  const actions = (course: Course): RowAction<Course>[] => [
    {
      label: 'Edit',
      icon: <Pencil size={14} />,
      onSelect: () => setEditingId(course.id),
    },
    {
      label: 'Delete',
      icon: <Trash2 size={14} />,
      onSelect: () => handleDelete(course.id, course.name),
      danger: true,
    },
  ];

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / 20));

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
          value={selectedIds.length.toLocaleString()}
          icon={<CheckSquare size={16} aria-hidden='true' />}
          tone={selectedIds.length > 0 ? 'danger' : 'neutral'}
          variant='accent'
          hint={selectedIds.length > 0 ? 'Ready for bulk delete' : 'Nothing selected'}
        />
        <KPI
          label='Pages'
          value={`${totalPages}`}
          icon={<Layers size={16} aria-hidden='true' />}
          tone='neutral'
          variant='accent'
          hint='20 per page'
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
          actions={
            selectedIds.length > 0 ? (
              <button
                type='button'
                onClick={handleBulkDelete}
                className='btn btn-danger btn-sm'
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                disabled={loading}
              >
                <Trash2 size={14} aria-hidden='true' />
                Delete Selected ({selectedIds.length})
              </button>
            ) : null
          }
        />

        <DataGrid
          data={filteredCourses}
          columns={columns}
          searchable={false}
          itemsPerPage={20}
          getRowId={(c) => c.id}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          rowActions={actions}
          editingRowId={editingId}
          renderEditableRow={(course) => (
            <td colSpan={3}>
              <form
                action={handleEdit}
                style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'flex-end', padding: 'var(--space-3) 0' }}
              >
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
            </td>
          )}
          emptyState={{
            icon: <BookOpen size={32} aria-hidden='true' />,
            title: searchQuery ? 'No courses match your search' : 'No courses yet',
            description: searchQuery
              ? 'Try a different course code or name.'
              : 'Click "Add Course" above to create the first one.',
          }}
        />
      </section>
    </div>
  );
}
