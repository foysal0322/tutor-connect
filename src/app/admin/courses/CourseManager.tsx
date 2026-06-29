'use client';

import { useState, useRef, useMemo } from 'react';
import { addCourse, updateCourse, deleteCourse, importCourses, deleteBulkCourses } from '@/app/actions/admin';

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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim()) return courses;
    return courses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [courses, searchQuery]);

  const totalPages = Math.ceil(filteredCourses.length / itemsPerPage);
  const currentCourses = filteredCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  async function handleAdd(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await addCourse(formData);
    if (res?.error) setError(res.error);
    else {
      (document.getElementById('add-course-form') as HTMLFormElement).reset();
      setSuccess('Course added successfully!');
    }
    setLoading(false);
  }

  async function handleEdit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await updateCourse(formData);
    if (res?.error) setError(res.error);
    else setEditingId(null);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this course?')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await deleteCourse(id);
    if (res?.error) setError(res.error);
    else {
      setSuccess('Course deleted successfully!');
      const newSelected = new Set(selectedIds);
      newSelected.delete(id);
      setSelectedIds(newSelected);
    }
    setLoading(false);
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} selected courses?`)) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    const res = await deleteBulkCourses(Array.from(selectedIds));
    if (res?.error) setError(res.error);
    else {
      setSuccess(`Successfully deleted ${selectedIds.size} courses!`);
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
        
        const mappedCourses = parsed.map(c => {
          if (!c.courseCode || !c.courseName) throw new Error('Missing courseCode or courseName in JSON');
          return { name: `${c.courseCode}: ${c.courseName}` };
        });

        const res = await importCourses(mappedCourses);
        if (res?.error) setError(res.error);
        else {
          setSuccess(`Successfully imported ${mappedCourses.length} courses!`);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (err: any) {
        setError('Failed to parse JSON file: ' + err.message);
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
      const newSelected = new Set(selectedIds);
      currentCourses.forEach(c => newSelected.add(c.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      currentCourses.forEach(c => newSelected.delete(c.id));
      setSelectedIds(newSelected);
    }
  }

  function handleSelectOne(id: string, checked: boolean) {
    const newSelected = new Set(selectedIds);
    if (checked) newSelected.add(id);
    else newSelected.delete(id);
    setSelectedIds(newSelected);
  }

  const isAllCurrentSelected = currentCourses.length > 0 && currentCourses.every(c => selectedIds.has(c.id));

  return (
    <div>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#047857', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{success}</div>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
        <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Manually Add Course</h2>
          <form id="add-course-form" action={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input name="name" type="text" placeholder="Course Name (e.g. ACT201: Intro...)" required style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
            <button type="submit" className="btn-primary" disabled={loading}>Add Course</button>
          </form>
        </div>

        <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Import Courses via JSON</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input type="file" accept=".json" ref={fileInputRef} style={{ padding: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            <button type="button" onClick={handleImport} className="btn-secondary" disabled={loading}>Import Courses</button>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
              type="text" 
              placeholder="Search courses..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1); // Reset to first page on search
              }}
              style={{ padding: '0.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', width: '250px' }}
            />
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete} 
                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}
                disabled={loading}
              >
                Delete Selected ({selectedIds.size})
              </button>
            )}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Total: {filteredCourses.length} courses
          </div>
        </div>

        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
            <tr>
              <th style={{ padding: '1rem', width: '50px', textAlign: 'center' }}>
                <input 
                  type="checkbox" 
                  checked={isAllCurrentSelected}
                  onChange={handleSelectAll}
                  disabled={currentCourses.length === 0}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '1rem' }}>Course Name</th>
              <th style={{ padding: '1rem', width: '200px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {currentCourses.map(course => (
              <tr key={course.id} style={{ borderBottom: '1px solid var(--border-color)', background: selectedIds.has(course.id) ? 'rgba(79, 70, 229, 0.05)' : 'transparent' }}>
                <td style={{ padding: '1rem', textAlign: 'center' }}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(course.id)}
                    onChange={(e) => handleSelectOne(course.id, e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '1rem' }} colSpan={editingId === course.id ? 2 : 1}>
                  {editingId === course.id ? (
                    <form action={handleEdit} style={{ display: 'flex', gap: '1rem', width: '100%' }}>
                      <input type="hidden" name="id" value={course.id} />
                      <input name="name" type="text" defaultValue={course.name} required style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button type="submit" className="btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} disabled={loading}>Save</button>
                        <button type="button" onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }} disabled={loading}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    course.name
                  )}
                </td>
                {editingId !== course.id && (
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => setEditingId(course.id)} className="btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}>Edit</button>
                      <button onClick={() => handleDelete(course.id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600 }}>Delete</button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        {currentCourses.length === 0 && <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No courses found.</p>}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', padding: '1rem', borderTop: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Previous
            </button>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
              className="btn-secondary"
              style={{ padding: '0.5rem 1rem' }}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
