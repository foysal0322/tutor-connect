'use client';

import { useState } from 'react';
import { submitTutorRequest } from '../actions';
import SearchableCourseSelect from '@/components/SearchableCourseSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import FloatingInput from '@/components/ui/FloatingInput';

export default function RequestTutorForm({ courses, selectedTutor }: { courses: any[], selectedTutor?: any }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCourseId = searchParams.get('courseId') || '';

  const expertise = selectedTutor
    ? selectedTutor.expertises.find((e: any) => e.courseId === defaultCourseId)
    : null;
  const defaultFee = expertise ? expertise.sessionFee : '';
  const selectedCourseName = selectedTutor && defaultCourseId
    ? courses.find(c => c.id === defaultCourseId)?.name
    : '';

  async function handleSubmit(formData: FormData) {
    if (selectedTutor) {
      formData.set('courseId', defaultCourseId);
      formData.set('budget', defaultFee.toString());
      formData.set('tutorId', selectedTutor.id);
    }

    if (!formData.get('courseId')) {
      setError('Please select a valid course from the list.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await submitTutorRequest(formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        router.push('/student');
      }
    } catch (err) {
      setError('An error occurred while submitting the request.');
    }
    setLoading(false);
  }

  return (
    <div className="card w-full">
      {error && <div className="mb-6 p-4 bg-danger-light text-danger-hover rounded-md font-medium border border-danger-hover">{error}</div>}

      {selectedTutor && (
        <div className="mb-6 p-4 bg-primary-light text-primary border border-primary rounded-md">
          <h3 className="text-lg font-semibold mb-2">Requesting Pre-Selected Tutor</h3>
          <p className="text-sm mb-1">
            Tutor: <strong>{selectedTutor.name}</strong> (CGPA: {selectedTutor.cgpa?.toFixed(2) || 'N/A'})
          </p>
          <p className="text-sm mb-1">
            Course: <strong>{selectedCourseName}</strong>
          </p>
          <p className="text-sm text-primary">
            Session Fee: <strong>{defaultFee} BDT / Session</strong> (Locked)
          </p>
        </div>
      )}

      <form action={handleSubmit} className="flex flex-col gap-4">
        {selectedTutor ? (
          <>
            <input type="hidden" name="courseId" value={defaultCourseId} />
            <input type="hidden" name="tutorId" value={selectedTutor.id} />
            <input type="hidden" name="budget" value={defaultFee} />
          </>
        ) : (
          <div className="form-group mb-0">
            <label className="form-label">Course</label>
            <SearchableCourseSelect courses={courses} defaultValue={defaultCourseId} />
          </div>
        )}

        <FloatingInput
          name="topic"
          label="Specific Topic/Chapter"
          required
        />

        <FloatingInput
          name="facultyName"
          label="Faculty Name (Optional)"
        />

        <div className="form-group mb-0">
          <label className="form-label">Preferred Mode</label>
          <select name="preferredMode" required className="form-select">
            <option value="">Select Mode</option>
            <option value="Online">Online</option>
            <option value="On Campus">On Campus</option>
          </select>
        </div>

        <FloatingInput
          name="preferredDateTime"
          type="datetime-local"
          label="Preferred Date & Time (Optional)"
        />

        {!selectedTutor && (
          <div className="form-group mb-0">
            <FloatingInput
              name="budget"
              type="number"
              min="0"
              step="any"
              required
              label="Approximate Budget (BDT)"
            />
            <span className="text-xs text-muted mt-1 block">
              Note: If an admin assigns a tutor whose session fee differs from your budget, the final amount payable will be the assigned tutor's fee.
            </span>
          </div>
        )}

        <button type="submit" className="btn-primary mt-4 w-full md:w-auto self-start" disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Submitting...
            </>
          ) : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
