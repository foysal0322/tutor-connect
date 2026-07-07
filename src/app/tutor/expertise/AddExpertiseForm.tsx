'use client';

import { useState, useEffect } from 'react';
import { addTutorExpertise, updateTutorExpertise } from '../actions';
import authStyles from '../../auth/auth.module.css';

import SearchableCourseSelect from '@/components/SearchableCourseSelect';
import { useRouter } from 'next/navigation';

export default function AddExpertiseForm({ courses, initialData, onSuccess, onCancel }: { courses: any[], initialData?: any, onSuccess?: () => void, onCancel?: () => void }) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [isGradeOpen, setIsGradeOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState(initialData?.courseGrade || '');
  const grades = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W'];

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

    const availabilityString = isAllDay ? 'Everyday' : `${selectedDays.join(', ')} (${startTime}-${endTime})`;
    formData.set('availability', availabilityString);

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
    <div className={authStyles.authCard} style={{ maxWidth: '100%' }}>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}

      <form action={handleSubmit}>
        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Course</label>
          <SearchableCourseSelect courses={courses} defaultValue={initialData?.courseId} />
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Semester Completed</label>
          <input name="semesterCompleted" type="text" defaultValue={initialData?.semesterCompleted} required className={authStyles.input} placeholder="e.g. Spring 2023" />
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Faculty Name</label>
          <input name="facultyName" type="text" defaultValue={initialData?.facultyName} required className={authStyles.input} placeholder="Who taught you?" />
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Course Grade</label>
          <input type="hidden" name="courseGrade" value={selectedGrade} required />
          <div style={{ position: 'relative' }}>
            <div
              className={authStyles.input}
              onClick={() => setIsGradeOpen(!isGradeOpen)}
              style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span style={{ color: selectedGrade ? 'inherit' : 'var(--text-muted)' }}>{selectedGrade || 'Select Grade'}</span>
              <span style={{ transform: isGradeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', fontSize: '0.8rem' }}>▼</span>
            </div>
            {isGradeOpen && (
              <ul style={{
                position: 'absolute', top: '100%', left: 0, right: 0,
                background: 'var(--card-bg)', border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)', zIndex: 50,
                maxHeight: '180px', overflowY: 'auto',
                listStyle: 'none', padding: 0, margin: '4px 0 0 0',
                boxShadow: 'var(--shadow-md)'
              }}>
                {grades.map(g => (
                  <li
                    key={g}
                    onClick={() => { setSelectedGrade(g); setIsGradeOpen(false); }}
                    style={{
                      padding: '0.75rem 1rem',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-color)',
                      background: selectedGrade === g ? 'var(--primary-light)' : 'transparent',
                      color: selectedGrade === g ? 'var(--primary)' : 'var(--text-main)',
                      fontWeight: selectedGrade === g ? 600 : 400
                    }}
                  >
                    {g}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
            <input type="checkbox" name="hideGrade" defaultChecked={initialData?.hideGrade} value="true" />
            Hide my acquired grade for this course from students
          </label>
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Availability</label>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => handleAllDayChange(e.target.checked)}
                style={{ width: '16px', height: '16px' }}
              />
              Everyday
            </label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {daysOfWeek.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                disabled={isAllDay}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: `1px solid ${selectedDays.includes(day) ? 'var(--primary)' : 'var(--border-color)'}`,
                  background: selectedDays.includes(day) ? 'var(--primary)' : 'transparent',
                  color: selectedDays.includes(day) ? '#fff' : 'var(--text-main)',
                  cursor: isAllDay ? 'not-allowed' : 'pointer',
                  opacity: isAllDay ? 0.5 : 1,
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  transition: 'all 0.2s'
                }}
              >
                {day}
              </button>
            ))}
          </div>

          {!isAllDay && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={authStyles.input}
                style={{ width: 'auto' }}
              />
              <span style={{ color: 'var(--text-muted)' }}>to</span>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={authStyles.input}
                style={{ width: 'auto' }}
              />
            </div>
          )}
        </div>

        <div className={authStyles.formGroup}>
          <label className={authStyles.label}>Session Fee (BDT)</label>
          <input name="sessionFee" type="number" defaultValue={initialData?.sessionFee} required min="0" className={authStyles.input} placeholder="e.g. 500" />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button type="submit" className={`btn-primary ${authStyles.submitBtn}`} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Saving...' : (initialData ? 'Save Changes' : 'Add Expertise')}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="btn-secondary" disabled={loading} style={{ flex: 1, padding: '0.75rem' }}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
