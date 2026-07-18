'use client';

import { useState, useRef, useMemo } from 'react';
import { addCourse, updateCourse, deleteCourse, importCourses, deleteBulkCourses } from '@/app/actions/admin';
import FloatingInput from '@/components/ui/FloatingInput';
import { Upload, Trash2, Search, CheckSquare } from 'lucide-react';

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
    <div className="flex flex-col gap-6">
      {error && <div className="bg-danger-light text-danger-hover p-4 rounded-lg font-medium">{error}</div>}
      {success && <div className="bg-success-light text-success-hover p-4 rounded-lg font-medium">{success}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-bold text-main mb-4">Manually Add Course</h2>
          <form id="add-course-form" action={handleAdd} className="flex flex-col gap-4">
            <FloatingInput name="name" type="text" label="Course Name (e.g. ACT201: Intro...)" required />
            <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-2 font-semibold rounded-lg transition-colors w-full" disabled={loading}>
              Add Course
            </button>
          </form>
        </div>

        <div className="card">
          <h2 className="text-lg font-bold text-main mb-4">Import Courses via JSON</h2>
          <div className="flex flex-col gap-4">
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              className="block w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary-light file:text-primary hover:file:bg-indigo-100 cursor-pointer" 
            />
            <button type="button" onClick={handleImport} className="btn bg-gray-100 text-main hover:bg-gray-200 px-4 py-2 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2" disabled={loading}>
              <Upload size={18} />
              Import Courses
            </button>
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row justify-between items-center p-4 border-b border-color bg-gray-50/50 gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" size={18} />
              <input 
                type="text" 
                placeholder="Search courses..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="form-input pl-10 h-[42px] w-full"
              />
            </div>
            {selectedIds.size > 0 && (
              <button 
                onClick={handleBulkDelete} 
                className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-4 py-2 text-sm font-semibold rounded-md transition-colors w-full sm:w-auto flex items-center justify-center gap-2"
                disabled={loading}
              >
                <Trash2 size={16} />
                Delete Selected ({selectedIds.size})
              </button>
            )}
          </div>
          <div className="text-muted text-sm font-medium w-full sm:w-auto text-center sm:text-right">
            Total: {filteredCourses.length} courses
          </div>
        </div>

        <div className="data-grid-container">
          <table className="data-grid hidden.md:table">
            <thead>
              <tr>
                <th className="w-[50px] text-center">
                  <input 
                    type="checkbox" 
                    checked={isAllCurrentSelected}
                    onChange={handleSelectAll}
                    disabled={currentCourses.length === 0}
                    className="cursor-pointer w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                  />
                </th>
                <th>Course Name</th>
                <th className="w-48">Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCourses.map(course => (
                <tr key={course.id} className={selectedIds.has(course.id) ? 'bg-primary-light/30' : ''}>
                  <td className="text-center">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(course.id)}
                      onChange={(e) => handleSelectOne(course.id, e.target.checked)}
                      className="cursor-pointer w-4 h-4 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                    />
                  </td>
                  <td colSpan={editingId === course.id ? 2 : 1}>
                    {editingId === course.id ? (
                      <form action={handleEdit} className="flex flex-col sm:flex-row gap-4 w-full">
                        <input type="hidden" name="id" value={course.id} />
                        <div className="flex-1">
                          <FloatingInput name="name" type="text" defaultValue={course.name} label="Course Name" required />
                        </div>
                        <div className="flex gap-2 items-center mt-1">
                          <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-2 text-sm font-semibold rounded-md transition-colors" disabled={loading}>Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="btn bg-gray-200 text-main hover:bg-gray-300 px-4 py-2 text-sm font-semibold rounded-md transition-colors" disabled={loading}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="font-semibold text-main">{course.name}</div>
                    )}
                  </td>
                  {editingId !== course.id && (
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingId(course.id)} className="btn bg-gray-100 text-main hover:bg-gray-200 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors">Edit</button>
                        <button onClick={() => handleDelete(course.id)} className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-3 py-1.5 text-xs font-semibold rounded-md transition-colors">Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Mobile View */}
          <div className="md:hidden flex flex-col p-2 bg-gray-50/50 gap-2">
             {/* Select all mobile */}
             {currentCourses.length > 0 && (
                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-color shadow-sm mb-2">
                  <input 
                    type="checkbox" 
                    id="select-all-mobile"
                    checked={isAllCurrentSelected}
                    onChange={handleSelectAll}
                    disabled={currentCourses.length === 0}
                    className="cursor-pointer w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <label htmlFor="select-all-mobile" className="font-medium text-sm text-main cursor-pointer flex-1">
                    Select All on Page
                  </label>
                </div>
              )}
            {currentCourses.map(course => (
              <div key={course.id} className={`card p-4 flex flex-col gap-3 ${selectedIds.has(course.id) ? 'ring-2 ring-primary border-primary bg-primary-light/10' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="pt-1">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(course.id)}
                      onChange={(e) => handleSelectOne(course.id, e.target.checked)}
                      className="cursor-pointer w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                    />
                  </div>
                  {editingId === course.id ? (
                      <form action={handleEdit} className="flex flex-col gap-3 w-full">
                        <input type="hidden" name="id" value={course.id} />
                        <FloatingInput name="name" type="text" defaultValue={course.name} label="Course Name" required />
                        <div className="flex gap-2">
                          <button type="submit" className="btn flex-1 bg-primary text-white hover:bg-primary-hover px-4 py-2 text-sm font-semibold rounded-md transition-colors" disabled={loading}>Save</button>
                          <button type="button" onClick={() => setEditingId(null)} className="btn flex-1 bg-gray-200 text-main hover:bg-gray-300 px-4 py-2 text-sm font-semibold rounded-md transition-colors" disabled={loading}>Cancel</button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex-1">
                        <div className="font-semibold text-main text-lg mb-3">{course.name}</div>
                        <div className="flex gap-2">
                          <button onClick={() => setEditingId(course.id)} className="btn flex-1 bg-gray-100 text-main hover:bg-gray-200 px-3 py-1.5 text-sm font-semibold rounded-md transition-colors">Edit</button>
                          <button onClick={() => handleDelete(course.id)} className="btn flex-1 bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-3 py-1.5 text-sm font-semibold rounded-md transition-colors">Delete</button>
                        </div>
                      </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {currentCourses.length === 0 && <div className="p-8 text-center text-muted">No courses found.</div>}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 p-4 border-t border-color bg-gray-50/50">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
              disabled={currentPage === 1}
              className="btn bg-gray-100 text-main hover:bg-gray-200 px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm font-medium text-main">
              Page {currentPage} of {totalPages}
            </span>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
              disabled={currentPage === totalPages}
              className="btn bg-gray-100 text-main hover:bg-gray-200 px-4 py-2 text-sm font-semibold rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
