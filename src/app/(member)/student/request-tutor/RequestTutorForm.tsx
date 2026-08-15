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
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
} from '@/components/forms';
import FormSubmitOverlay from '@/components/ui/FormSubmitOverlay';

export default function RequestTutorForm({
  courses,
  selectedTutor,
}: {
  courses: any[];
  selectedTutor?: any;
}) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // Native <input type="datetime-local"> renders an inconsistent, time-less
  // control in Firefox. We split it into date + time inputs (both reliable
  // cross-browser) and merge back into a single ISO-ish string on submit.
  // Values are in the user's local timezone; format: YYYY-MM-DD / HH:mm.
  const todayStr = useState(() => new Date().toISOString().slice(0, 10))[0];
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  // When the chosen day is today, also block past times.
  const minTime = preferredDate === todayStr
    ? new Date().toTimeString().slice(0, 5)
    : undefined;
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

    // Merge the date + time fields back into the single preferredDateTime
    // value the schema/server expects. Treat "only one of the two filled"
    // as invalid so we never persist a half-formed timestamp.
    if (preferredDate && preferredTime) {
      formData.set('preferredDateTime', `${preferredDate}T${preferredTime}`);
    } else if (!preferredDate && !preferredTime) {
      formData.set('preferredDateTime', '');
    } else {
      setError('Please fill in both the preferred date and the time, or leave both blank.');
      return;
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
        // After submitting, the student's next step is to pay (or wait for an
        // admin match first). Land them on the payments page, not the dashboard.
        router.push('/student/payments#pending-payments');
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
    <FormCard
      surface="embedded"
      icon={<ClipboardList size={28} />}
      title="Request a Tutor"
      subtitle="Fill in the details below to get matched with the right tutor."
    >
      {error && <FormAlert>{error}</FormAlert>}

      {selectedTutor && (
        <div className="mb-6 p-3 sm:p-4 bg-primary-light text-primary border border-primary rounded-md">
          <h3 className="text-base sm:text-lg font-semibold mb-2">Requesting Pre-Selected Tutor</h3>
          <div className="space-y-1 text-sm break-words">
            <p>
              Tutor: <strong>{selectedTutor.name}</strong> (CGPA: {selectedTutor.cgpa?.toFixed(2) || 'N/A'})
            </p>
            <p>
              Course: <strong>{selectedCourseName}</strong>
            </p>
            <p>
              Session Fee: <strong>{defaultFee} BDT / Session</strong> (Locked)
            </p>
          </div>
        </div>
      )}

      <form action={handleSubmit} noValidate>
        <FormSubmitOverlay
          title="Submitting your request"
          message="Matching you with the right tutor — hang tight…"
        />
        <FormSection label="Request Details" icon={<ClipboardList size={14} />} columns={1}>
          {selectedTutor ? (
            <>
              <input type="hidden" name="courseId" value={defaultCourseId} />
              <input type="hidden" name="tutorId" value={selectedTutor.id} />
              <input type="hidden" name="budget" value={defaultFee} />
            </>
          ) : (
            <div className={fieldClass}>
              <SearchableCourseSelect courses={courses} defaultValue={defaultCourseId} required />
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

          {/* Stack on mobile so each picker gets full width; sit side-by-side
              from sm up. Inline `display: flex` (the old version) never wraps,
              which made these two fields overflow small viewports. */}
          <div className={`${fieldClass} grid grid-cols-1 sm:grid-cols-2 sm:gap-3`}>
            <Input
              name="preferredDate"
              type="date"
              label="Preferred Date (Optional)"
              min={todayStr}
              value={preferredDate}
              onChange={(e) => setPreferredDate(e.target.value)}
            />
            <Input
              name="preferredTime"
              type="time"
              label="Preferred Time (Optional)"
              min={minTime}
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
            />
          </div>

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
    </FormCard>
  );
}
