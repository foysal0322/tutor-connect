'use client';

import { useState } from 'react';
import { assignTutorToRequest } from './actions';

export default function AssignTutorForm({ requestId, courseId, tutors }: { requestId: string, courseId: string, tutors: any[] }) {
  const [loading, setLoading] = useState(false);

  // Filter tutors who have expertise in this course
  const eligibleTutors = tutors.filter(t => t.expertises.some((e: any) => e.courseId === courseId));

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await assignTutorToRequest(formData);
    setLoading(false);
  }

  return (
    <form action={handleSubmit} style={{ display: 'flex', gap: '0.5rem' }}>
      <input type="hidden" name="requestId" value={requestId} />
      <select name="tutorId" required style={{ padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
        <option value="">Select Tutor</option>
        {eligibleTutors.map(t => (
          <option key={t.id} value={t.id}>{t.name} (Fee: {t.expertises.find((e: any) => e.courseId === courseId)?.sessionFee} BDT)</option>
        ))}
      </select>
      <button type="submit" className="btn-primary" style={{ padding: '0.5rem 1rem' }} disabled={loading}>
        {loading ? 'Assigning...' : 'Assign'}
      </button>
    </form>
  );
}
