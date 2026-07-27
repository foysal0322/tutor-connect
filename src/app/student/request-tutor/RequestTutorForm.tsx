'use client';

import { useState } from 'react';
import { submitTutorRequest } from '../actions';
import SearchableCourseSelect from '@/components/SearchableCourseSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import FloatingInput from '@/components/ui/FloatingInput';
import LoadingButton from '@/components/ui/LoadingButton';
import ErrorAlert from '@/components/ui/ErrorAlert';

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
        setError(`Failed to submit request: ${res.error}`);
      } else if (res?.success) {
        router.push('/student');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred while submitting the request.';
      setError(errorMessage);
      console.error('Tutor request submission error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card w-full">
      {error && (
        <ErrorAlert
          type="error"
          title="Submission Error"
          message={error}
          onDismiss={() => setError('')}
        />
      )}

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

        <LoadingButton
          type="submit"
          loading={loading}
          loadingText="Submitting..."
          className="mt-4 w-full md:w-auto self-start"
        >
          Submit Request
        </LoadingButton>
      </form>
    </div>
  );
}
