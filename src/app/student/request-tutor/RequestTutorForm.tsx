'use client';

import { useState } from 'react';
import { submitTutorRequest } from '../actions';
import authStyles from '../../auth/auth.module.css';

import SearchableCourseSelect from '@/components/SearchableCourseSelect';
import { useRouter, useSearchParams } from 'next/navigation';

export default function RequestTutorForm({ courses, selectedTutor }: { courses: any[], selectedTutor?: any }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCourseId = searchParams.get('courseId') || '';

  // Calculate default budget/fee for preselected tutor
  const expertise = selectedTutor
    ? selectedTutor.expertises.find((e: any) => e.courseId === defaultCourseId)
    : null;
  const defaultFee = expertise ? expertise.sessionFee : '';
  const selectedCourseName = selectedTutor && defaultCourseId
    ? courses.find(c => c.id === defaultCourseId)?.name
    : '';

  async function handleSubmit(formData: FormData) {
    // If selectedTutor is present, we must append courseId, budget and tutorId manually
    // because disabled inputs are not submitted in standard forms.
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
    <div className={authStyles.authCard} style={{ maxWidth: '100%' }}>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}

      {selectedTutor && (
        <div style={{
          background: 'var(--primary-light)',
          border: '1px solid var(--primary)',
          borderRadius: '8px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: 'var(--primary)'
        }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>Requesting Pre-Selected Tutor</h3>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            Tutor: <strong>{selectedTutor.name}</strong> (CGPA: {selectedTutor.cgpa?.toFixed(2) || 'N/A'})
          </p>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            Course: <strong>{selectedCourseName}</strong>
          </p>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            Session Fee: <strong>{defaultFee} BDT / Month</strong> (Locked)
          </p>
        </div>
      )}

      <form action={handleSubmit}>
        {selectedTutor ? (
          <>
            <input type="hidden" name="courseId" value={defaultCourseId} />
            <input type="hidden" name="tutorId" value={selectedTutor.id} />
            <input type="hidden" name="budget" value={defaultFee} />
          </>
        ) : (
          <div className={authStyles.formGroup}>
            <label className={authStyles.label}>Course</label>
            <SearchableCourseSelect courses={courses} defaultValue={defaultCourseId} />
          </div>
        )}

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Specific Topic/Chapter</label>
          <input name="topic" type="text" required className={authStyles.input} placeholder="e.g. Recursion and Pointers" />
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Faculty Name (Optional)</label>
          <input name="facultyName" type="text" className={authStyles.input} placeholder="Who teaches the course?" />
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Preferred Mode</label>
          <select name="preferredMode" required className={authStyles.select}>
            <option value="">Select Mode</option>
            <option value="Online">Online</option>
            <option value="On Campus">On Campus</option>
          </select>
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Preferred Date & Time (Optional)</label>
          <input name="preferredDateTime" type="datetime-local" className={authStyles.input} />
        </div>

        {!selectedTutor && (
          <div className={authStyles.formGroup}>
            <label className={authStyles.label}>Approximate Budget (BDT)</label>
            <input name="budget" type="number" required min="0" step="any" className={authStyles.input} placeholder="e.g. 500.50" />
            <span style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem', display: 'block' }}>
              Note: If an admin assigns a tutor whose session fee differs from your budget, the final amount payable will be the assigned tutor's fee. You will be notified when a tutor is assigned.
            </span>
          </div>
        )}

        <button type="submit" className={`btn-primary ${authStyles.submitBtn}`} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
