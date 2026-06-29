'use client';

import { useState } from 'react';
import { submitTutorRequest } from '../actions';
import authStyles from '../../auth/auth.module.css';

import SearchableCourseSelect from '@/components/SearchableCourseSelect';
import { useRouter } from 'next/navigation';

export default function RequestTutorForm({ courses }: { courses: any[] }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
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

      <form action={handleSubmit}>
        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Course</label>
          <SearchableCourseSelect courses={courses} />
        </div>

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
          <label className={authStyles.label}>Approximate Budget (BDT)</label>
          <input name="budget" type="number" required min="0" step="50" className={authStyles.input} placeholder="e.g. 500" />
        </div>

        <button type="submit" className={`btn-primary ${authStyles.submitBtn}`} disabled={loading}>
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}
