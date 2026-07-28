'use client';

import { useState } from 'react';
import { assignTutorToRequest } from './actions';
import { FormSubmit, fieldClass } from '@/components/forms';

export default function AssignTutorForm({
  requestId,
  courseId,
  tutors,
}: {
  requestId: string;
  courseId: string;
  tutors: any[];
}) {
  const [loading, setLoading] = useState(false);

  // Filter tutors who have expertise in this course
  const eligibleTutors = tutors.filter((t) => t.expertises.some((e: any) => e.courseId === courseId));

  async function handleSubmit(formData: FormData) {
    const rId = formData.get('requestId') as string;
    const tId = formData.get('tutorId') as string;
    if (!rId || !tId) return;

    setLoading(true);
    await assignTutorToRequest(rId, tId);
    setLoading(false);
  }

  return (
    <form action={handleSubmit} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input type="hidden" name="requestId" value={requestId} />
      <div className={fieldClass}>
        <select name="tutorId" required className="form-select" defaultValue="">
          <option value="">Select Tutor</option>
          {eligibleTutors.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (Fee: {t.expertises.find((e: any) => e.courseId === courseId)?.sessionFee} BDT)
            </option>
          ))}
        </select>
      </div>
      <FormSubmit fullWidth={false} loading={loading} loadingText="Assigning...">
        Assign
      </FormSubmit>
    </form>
  );
}
