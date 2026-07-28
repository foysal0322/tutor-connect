'use client';

import { useState, useEffect } from 'react';
import { addTutorExpertise, updateTutorExpertise } from '../actions';
import SearchableCourseSelect from '@/components/SearchableCourseSelect';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';

export default function AddExpertiseForm({ courses, initialData, onSuccess, onCancel }: { courses: any[], initialData?: any, onSuccess?: () => void, onCancel?: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [isGradeOpen, setIsGradeOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(initialData?.courseGrade || '');
  const grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W'];

  const [semesterCompleted, setSemesterCompleted] = useState(initialData?.semesterCompleted || '');
  const [facultyName, setFacultyName] = useState(initialData?.facultyName || '');
  const [sessionFee, setSessionFee] = useState(initialData?.sessionFee?.toString() || '');

  function parseDays(str: string) {
    if (!str) return [];
    return str.split(' (')[0].split(', ').filter(Boolean);
  }
  function parseIsAllDay(str: string) {
    if (!str) return false;
    const timeStr = str.split(' (')[1]?.replace(')', '');
    return timeStr === 'All Day';
  }
  function parseStartTime(str: string) {
    if (!str) return '';
    const timeStr = str.split(' (')[1]?.replace(')', '');
    return timeStr === 'All Day' ? '' : (timeStr?.split('-')[0] || '');
  }
  function parseEndTime(str: string) {
    if (!str) return '';
    const timeStr = str.split(' (')[1]?.replace(')', '');
    return timeStr === 'All Day' ? '' : (timeStr?.split('-')[1] || '');
  }

  // Availability State
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');

  useEffect(() => {
    if (initialData?.availability) {
      const isAll = initialData.availability === 'Everyday';
      setIsAllDay(isAll);
      if (isAll) {
        setSelectedDays([]);
        setStartTime('');
        setEndTime('');
      } else {
        setSelectedDays(parseDays(initialData.availability));
        setStartTime(parseStartTime(initialData.availability));
        setEndTime(parseEndTime(initialData.availability));
      }
    } else {
      setSelectedDays([]);
      setIsAllDay(false);
      setStartTime('');
      setEndTime('');
    }
  }, [initialData]);

  const daysOfWeek = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const toggleDay = (day: string) => {
    if (isAllDay) return;
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setSelectedDays([]);
      setStartTime('');
      setEndTime('');
    }
  };

  async function handleSubmit(formData: FormData) {
    if (!formData.get('courseId')) {
      setError('Please select a valid course from the list.');
      return;
    }
    if (!isAllDay && selectedDays.length === 0) {
      setError('Please select at least one available day.');
      return;
    }
    if (!isAllDay && (!startTime || !endTime)) {
      setError('Please specify a time range.');
      return;
    }
    if (!selectedGrade) {
      setError('Please select a course grade.');
      return;
    }

    const availabilityString = isAllDay ? 'Everyday' : `${selectedDays.join(', ')} (${startTime}-${endTime})`;
    formData.set('availability', availabilityString);
    formData.set('semesterCompleted', semesterCompleted);
    formData.set('facultyName', facultyName);
    formData.set('sessionFee', sessionFee);
    formData.set('courseGrade', selectedGrade);

    if (initialData) {
      formData.set('id', initialData.id);
    }

    setLoading(true);
    setError('');
    try {
      const res = initialData ? await updateTutorExpertise(formData) : await addTutorExpertise(formData);
      if (res?.error) {
        setError(res.error);
      } else if (res?.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          router.push('/tutor/expertise');
        }
      }
    } catch (err) {
      setError('An error occurred while saving expertise.');
    }
    setLoading(false);
  }

  return (
    <div className="w-full">
      {error && <div className="p-4 bg-danger-light text-danger-hover rounded-md font-medium border border-danger-hover mb-6">{error}</div>}

      <form action={handleSubmit} className="flex flex-col gap-5">
        <div className="form-group mb-0">
          <label className="form-label text-sm font-semibold mb-1">Course</label>
          <SearchableCourseSelect courses={courses} defaultValue={initialData?.courseId} />
        </div>

        {!initialData && (
          <Input
            name="cgpa"
            type="number"
            step="any"
            min="0"
            max="4.0"
            label="Your Overall CGPA (Optional)"
            placeholder="e.g. 3.75"
          />
        )}

        <Input
          name="semesterCompleted"
          type="text"
          required
          label="Semester Completed"
          placeholder="e.g. Spring 2023"
          value={semesterCompleted}
          onChange={(e) => setSemesterCompleted(e.target.value)}
        />

        <Input
          name="facultyName"
          type="text"
          required
          label="Faculty Name"
          placeholder="Who taught you?"
          value={facultyName}
          onChange={(e) => setFacultyName(e.target.value)}
        />

        <div className="form-group mb-0 relative">
          <label className="form-label text-sm font-semibold mb-1">Course Grade</label>
          <div
            className="form-select flex justify-between items-center cursor-pointer"
            onClick={() => setIsGradeOpen(!isGradeOpen)}
          >
            <span className={selectedGrade ? 'text-main' : 'text-muted'}>{selectedGrade || 'Select Grade'}</span>
            <span className={`text-xs transition-transform ${isGradeOpen ? 'rotate-180' : ''}`}>▼</span>
          </div>
          {isGradeOpen && (
            <ul className="absolute top-full left-0 right-0 bg-white border border-color rounded-md z-50 max-h-[180px] overflow-y-auto mt-1 shadow-lg">
              {grades.map(g => (
                <li
                  key={g}
                  onClick={() => { setSelectedGrade(g); setIsGradeOpen(false); }}
                  className={`p-3 cursor-pointer border-b border-color last:border-b-0 hover:bg-gray-50 transition-colors ${selectedGrade === g ? 'bg-primary-light text-primary font-semibold' : 'text-main'}`}
                >
                  {g}
                </li>
              ))}
            </ul>
          )}
          <label className="flex items-center gap-2 cursor-pointer text-sm text-muted mt-2 hover:text-main transition-colors w-fit">
            <input 
              type="checkbox" 
              name="hideGrade" 
              defaultChecked={initialData?.hideGrade} 
              value="true" 
              className="w-4 h-4 rounded border-color text-primary focus:ring-primary cursor-pointer"
            />
            Hide my acquired grade for this course from students
          </label>
        </div>

        <div className="form-group mb-0">
          <label className="form-label text-sm font-semibold mb-2">Availability</label>

          <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-main mb-3 w-fit hover:text-primary transition-colors">
            <input
              type="checkbox"
              checked={isAllDay}
              onChange={(e) => handleAllDayChange(e.target.checked)}
              className="w-4 h-4 rounded border-color text-primary focus:ring-primary cursor-pointer"
            />
            Everyday
          </label>

          <div className="flex gap-2 flex-wrap mb-4">
            {daysOfWeek.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                disabled={isAllDay}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
                  selectedDays.includes(day) 
                    ? 'bg-primary border-primary text-white shadow-md' 
                    : 'border-color text-main hover:border-primary/50'
                } ${isAllDay ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {day}
              </button>
            ))}
          </div>

          {!isAllDay && (
            <div className="flex gap-4 items-center bg-gray-50 p-4 rounded-md border border-color">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="form-input"
              />
              <span className="text-muted font-medium">to</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="form-input"
              />
            </div>
          )}
        </div>

        <Input
          name="sessionFee"
          type="number"
          min="100"
          step="any"
          required
          label="Session Fee (BDT)"
          placeholder="e.g. 500.50"
          value={sessionFee}
          onChange={(e) => setSessionFee(e.target.value)}
        />

        <div className="flex gap-4 mt-2">
          <button type="submit" className="btn-primary flex-1 justify-center" disabled={loading}>
            {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Expertise')}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-outline flex-1 justify-center" disabled={loading}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
