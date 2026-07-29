'use client';

import { Select } from '@/components/ui/Select';

/**
 * Searchable course picker — a thin wrapper over the shared <Select> combobox.
 *
 * External contract preserved: emits a form field named "courseId" and keeps
 * the same props (courses / defaultValue / required / label) used by
 * RequestTutorForm and AddExpertiseForm.
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
  return (
    <Select
      searchable
      label={label}
      required={required}
      defaultValue={defaultValue}
      name="courseId"
      placeholderOption="Search for a course…"
      hint={`${courses.length} course${courses.length === 1 ? '' : 's'} available`}
      options={courses.map((course) => ({ value: course.id, label: course.name }))}
    />
  );
}
