'use client';

import { useState } from 'react';
import { assignTutorToRequest } from './actions';
import { FormSubmit, fieldClass } from '@/components/forms';
import { Select } from '@/components/ui/Select';

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
      <Select
        containerClassName={fieldClass}
        name="tutorId"
        label="Tutor"
        hideLabel
        searchable
        required
        placeholderOption="Select Tutor"
        defaultValue=""
        options={eligibleTutors.map((t) => ({
          value: t.id,
          label: `${t.name} (Fee: ${t.expertises.find((e: any) => e.courseId === courseId)?.sessionFee} BDT)`,
        }))}
      />
      <FormSubmit fullWidth={false} loading={loading} loadingText="Assigning...">
        Assign
      </FormSubmit>
    </form>
  );
}
