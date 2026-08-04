'use client';

import { useState } from 'react';
import { updateTutorExpertise, deleteTutorExpertise } from '@/app/actions/admin';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import { formatBDT } from '@/lib/format';
import { Pencil, Trash2 } from 'lucide-react';

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

  async function handleDelete(id: string) {
    if (!confirm('Delete this expertise? This cannot be undone.')) return;
    setLoading(true);
    setError('');
    setSuccess('');
    const res = await deleteTutorExpertise(id);
    if (res?.error) setError(res.error);
    else setSuccess('Expertise deleted.');
    setLoading(false);
  }

  // Flat course list for the dropdown (Select doesn't support optgroups).
  const courseOptions = courses.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  return (
    <div className="flex flex-col gap-4">
      {error && <FormAlert>{error}</FormAlert>}
      {success && <FormAlert tone="success">{success}</FormAlert>}

      <div className="card p-0 overflow-hidden">
        <div className="data-grid-container">
          <table className="data-grid hidden md:table">
            <thead>
              <tr>
                <th>Tutor</th>
                <th>Course</th>
                <th>Faculty / Grade</th>
                <th>Availability</th>
                <th>Fee</th>
                <th>Status</th>
                <th className="w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {expertises.map((exp) => {
                const isEditing = editingId === exp.id;
                return (
                  <tr key={exp.id}>
                    {isEditing ? (
                      <td colSpan={7}>
                        <form action={handleEdit} className="p-2">
                          <input type="hidden" name="id" value={exp.id} />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <Select
                                containerClassName={fieldClass}
                                name="courseId"
                                label="Course"
                                searchable
                                defaultValue={exp.courseId}
                                options={courseOptions}
                              />
                            </div>
                            <Input
                              containerClassName={fieldClass}
                              name="sessionFee"
                              type="number"
                              step="any"
                              min="0"
                              label="Session Fee (BDT)"
                              defaultValue={exp.sessionFee}
                            />
                            <Input
                              containerClassName={fieldClass}
                              name="facultyName"
                              label="Faculty Name"
                              defaultValue={exp.facultyName}
                              required
                            />
                            <Input
                              containerClassName={fieldClass}
                              name="courseGrade"
                              label="Course Grade"
                              defaultValue={exp.courseGrade}
                              required
                            />
                            <Input
                              containerClassName={fieldClass}
                              name="semesterCompleted"
                              label="Semester Completed"
                              defaultValue={exp.semesterCompleted}
                            />
                            <Input
                              containerClassName={fieldClass}
                              name="availability"
                              label="Availability"
                              defaultValue={exp.availability}
                            />
                          </div>
                          <div className="flex flex-wrap gap-4 mt-3 items-center">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" name="hideGrade" defaultChecked={exp.hideGrade} className="w-4 h-4" />
                              Hide grade from students
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input type="checkbox" name="isActive" defaultChecked={exp.isActive} className="w-4 h-4" />
                              Active
                            </label>
                          </div>
                          <div className="flex gap-2 mt-4">
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
                      </td>
                    ) : (
                      <>
                        <td>
                          <div className="font-semibold text-main">{exp.tutor.name}</div>
                          <div className="text-xs text-muted">{exp.tutor.nsuId}</div>
                        </td>
                        <td className="font-medium">{exp.course.name}</td>
                        <td>
                          <div className="text-sm">{exp.facultyName}</div>
                          <span className={`badge badge-primary ${exp.hideGrade ? 'opacity-50' : ''}`}>
                            {exp.courseGrade}
                            {exp.hideGrade ? ' (hidden)' : ''}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{exp.availability || '—'}</td>
                        <td>
                          <span className="font-semibold text-primary">
                            {formatBDT(exp.sessionFee)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${exp.isActive ? 'badge-success' : 'badge-warning'}`}>
                            {exp.isActive ? 'Active' : 'Hidden'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingId(exp.id)}
                              disabled={loading}
                              className="btn bg-gray-100 text-main hover:bg-gray-200 p-2 rounded-md transition-colors"
                              aria-label="Edit expertise"
                              title="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => handleDelete(exp.id)}
                              disabled={loading}
                              className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white p-2 rounded-md transition-colors"
                              aria-label="Delete expertise"
                              title="Delete"
                            >
                              <Trash2 size={14} />
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

          {/* Mobile card view */}
          <div className="md:hidden flex flex-col gap-3 p-3">
            {expertises.map((exp) => {
              const isEditing = editingId === exp.id;
              if (isEditing) {
                return (
                  <div key={exp.id} className="card p-4">
                    <form action={handleEdit} className="flex flex-col gap-3">
                      <input type="hidden" name="id" value={exp.id} />
                      <Select
                        containerClassName={fieldClass}
                        name="courseId"
                        label="Course"
                        searchable
                        defaultValue={exp.courseId}
                        options={courseOptions}
                      />
                      <Input
                        containerClassName={fieldClass}
                        name="sessionFee"
                        type="number"
                        step="any"
                        min="0"
                        label="Session Fee (BDT)"
                        defaultValue={exp.sessionFee}
                      />
                      <Input
                        containerClassName={fieldClass}
                        name="facultyName"
                        label="Faculty Name"
                        defaultValue={exp.facultyName}
                        required
                      />
                      <Input
                        containerClassName={fieldClass}
                        name="courseGrade"
                        label="Course Grade"
                        defaultValue={exp.courseGrade}
                        required
                      />
                      <Input
                        containerClassName={fieldClass}
                        name="availability"
                        label="Availability"
                        defaultValue={exp.availability}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="hideGrade" defaultChecked={exp.hideGrade} className="w-4 h-4" />
                        Hide grade
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="isActive" defaultChecked={exp.isActive} className="w-4 h-4" />
                        Active
                      </label>
                      <div className="flex gap-2">
                        <FormSubmit fullWidth={false} loading={loading} loadingText="Saving...">
                          Save
                        </FormSubmit>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="btn bg-gray-200 text-main hover:bg-gray-300 px-4 py-2 text-sm font-semibold rounded-md"
                          disabled={loading}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                );
              }
              return (
                <div key={exp.id} className="card p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-semibold">{exp.tutor.name}</div>
                      <div className="text-xs text-muted">{exp.tutor.nsuId}</div>
                    </div>
                    <span className={`badge ${exp.isActive ? 'badge-success' : 'badge-warning'}`}>
                      {exp.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <div className="text-sm font-medium">{exp.course.name}</div>
                  <div className="text-xs text-muted">
                    {exp.facultyName} · Grade {exp.courseGrade}
                    {exp.hideGrade ? ' (hidden)' : ''}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-primary">
                      {formatBDT(exp.sessionFee)} BDT
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingId(exp.id)}
                        disabled={loading}
                        className="btn bg-gray-100 text-main hover:bg-gray-200 px-3 py-1.5 text-sm font-semibold rounded-md"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        disabled={loading}
                        className="btn bg-danger-light text-danger-hover hover:bg-danger hover:text-white px-3 py-1.5 text-sm font-semibold rounded-md"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {expertises.length === 0 && (
            <div className="p-8 text-center text-muted">No expertises found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
