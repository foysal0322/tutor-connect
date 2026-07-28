'use client';

import { useState } from 'react';
import { submitTutorRequest } from '../actions';
import SearchableCourseSelect from '@/components/SearchableCourseSelect';
import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ClipboardList, Send } from 'lucide-react';
import { useZodForm } from '@/hooks/useZodForm';
import { submitTutorRequestSchema } from '@/lib/validation';
import {
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  cardEmbeddedClass,
} from '@/components/forms';

export default function RequestTutorForm({
  courses,
  selectedTutor,
}: {
  courses: any[];
  selectedTutor?: any;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCourseId = searchParams.get('courseId') || '';
  const form = useZodForm(submitTutorRequestSchema);

  const expertise = selectedTutor
    ? selectedTutor.expertises.find((e: any) => e.courseId === defaultCourseId)
    : null;
  const defaultFee = expertise ? expertise.sessionFee : '';
  const selectedCourseName =
    selectedTutor && defaultCourseId ? courses.find((c) => c.id === defaultCourseId)?.name : '';

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
    if (!form.validateAll(formData)) return;
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
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred while submitting the request.';
      setError(errorMessage);
      console.error('Tutor request submission error:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cardEmbeddedClass}>
      {error && <FormAlert>{error}</FormAlert>}

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

      <form action={handleSubmit} noValidate>
        <FormSection label="Request Details" icon={<ClipboardList size={14} />} columns={1}>
          {selectedTutor ? (
            <>
              <input type="hidden" name="courseId" value={defaultCourseId} />
              <input type="hidden" name="tutorId" value={selectedTutor.id} />
              <input type="hidden" name="budget" value={defaultFee} />
            </>
          ) : (
            <div className={fieldClass}>
              <label className="form-label">Course</label>
              <SearchableCourseSelect courses={courses} defaultValue={defaultCourseId} />
            </div>
          )}

          <Input
            containerClassName={fieldClass}
            name="topic"
            label="Specific Topic/Chapter"
            required
            error={form.errors.topic}
            onChange={form.onChange('topic')}
            onBlur={form.onBlur('topic')}
          />

          <Input containerClassName={fieldClass} name="facultyName" label="Faculty Name (Optional)" />

          <Select
            containerClassName={fieldClass}
            name="preferredMode"
            label="Preferred Mode"
            required
            placeholderOption="Select Mode"
            options={[
              { value: 'Online', label: 'Online' },
              { value: 'On Campus', label: 'On Campus' },
            ]}
            error={form.errors.preferredMode}
          />

          <Input
            containerClassName={fieldClass}
            name="preferredDateTime"
            type="datetime-local"
            label="Preferred Date & Time (Optional)"
          />

          {!selectedTutor && (
            <Input
              containerClassName={fieldClass}
              name="budget"
              type="number"
              min="100"
              step="any"
              required
              label="Approximate Budget (BDT)"
              hint="If an admin assigns a tutor whose session fee differs from your budget, the final amount payable will be the assigned tutor's fee. Minimum 100 BDT."
              error={form.errors.budget}
              onChange={form.onChange('budget')}
              onBlur={form.onBlur('budget')}
            />
          )}
        </FormSection>

        <FormSubmit loading={loading} loadingText="Submitting..." icon={<Send size={18} />}>
          Submit Request
        </FormSubmit>
      </form>
    </div>
  );
}
