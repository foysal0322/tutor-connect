'use client';
import { useState, useRef, useEffect } from 'react';
import authStyles from '../app/auth/auth.module.css';

export default function SearchableCourseSelect({ courses, defaultValue = '' }: { courses: any[], defaultValue?: string }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<any>(
    courses.find(c => c.id === defaultValue) || null
  );

  useEffect(() => {
    if (selectedCourse) {
      setQuery(selectedCourse.name);
    }
  }, []);

  const filteredCourses = courses.filter(c => c.name.toLowerCase().includes(query.toLowerCase()));
  
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        if (selectedCourse) {
           setQuery(selectedCourse.name);
        } else {
           setQuery('');
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedCourse]);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input type="hidden" name="courseId" value={selectedCourse ? selectedCourse.id : ''} required />
      <input 
        type="text" 
        className={authStyles.input}
        placeholder="Search for a course..."
        value={query}
        onChange={(e) => {
           setQuery(e.target.value);
           setIsOpen(true);
           setSelectedCourse(null);
        }}
        onFocus={() => setIsOpen(true)}
      />
      
      {isOpen && (
        <div style={{ 
          position: 'absolute', 
          top: '100%', 
          left: 0, 
          right: 0, 
          maxHeight: '200px', 
          overflowY: 'auto',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          marginTop: '4px',
          zIndex: 10,
          boxShadow: 'var(--shadow-md)'
        }}>
          {filteredCourses.length > 0 ? filteredCourses.map(course => (
            <div 
              key={course.id}
              onClick={() => {
                setSelectedCourse(course);
                setQuery(course.name);
                setIsOpen(false);
              }}
              style={{
                padding: '0.75rem',
                cursor: 'pointer',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-main)',
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {course.name}
            </div>
          )) : (
            <div style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>No courses found</div>
          )}
        </div>
      )}
    </div>
  );
}
