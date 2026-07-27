'use client';

import { useId } from 'react';

/**
 * Accessible course picker built on the native <select>.
 *
 * The previous implementation was a custom dropdown on <div>s without any
 * ARIA combobox semantics — screen-reader users couldn't operate it and
 * keyboard users couldn't reliably select. Native <select> gets all of that
 * for free.
 *
 * For lists of more than ~100 courses, swap to a full WAI-ARIA combobox
 * (see FRONTEND_AUDIT.md D5). The dataset here is small enough that the
 * native picker is the right call.
 *
 * External contract preserved: emits a form field named "courseId".
 */

interface Course {
  id: string;
  name: string;
}

interface Props {
  courses: Course[];
  defaultValue?: string;
  required?: boolean;
  label?: string;
}

export default function SearchableCourseSelect({
  courses,
  defaultValue = '',
  required,
  label = 'Course',
}: Props) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div style={{ marginBottom: 'var(--space-5)' }}>
      <label
        htmlFor={id}
        style={{
          display: 'block',
          fontSize: 'var(--text-sm)',
          fontWeight: 500,
          marginBottom: 'var(--space-2)',
          color: 'var(--text-main)',
        }}
      >
        {label}
        {required && (
          <span aria-label="required" style={{ color: 'var(--danger)', marginLeft: '0.25rem' }}>
            *
          </span>
        )}
      </label>
      <select
        id={id}
        name="courseId"
        className="form-select"
        defaultValue={defaultValue}
        required={required}
        aria-describedby={hintId}
      >
        <option value="">Search for a course…</option>
        {courses.map((course) => (
          <option key={course.id} value={course.id}>
            {course.name}
          </option>
        ))}
      </select>
      <div id={hintId} className="form-hint">
        {courses.length} courses available
      </div>
    </div>
  );
}
