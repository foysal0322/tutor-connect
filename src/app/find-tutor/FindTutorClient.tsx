'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import styles from './find-tutor.module.css';
import { useDebounce } from '@/hooks/useDebounce';

interface Expertise {
  id: string;
  tutorId: string;
  courseId: string;
  semesterCompleted: string;
  facultyName: string;
  courseGrade: string;
  availability: string;
  sessionFee: number;
  tutor: {
    id: string;
    name: string;
    cgpa: number | null;
    gender: string | null;
    studentsTaught?: number;
    averageRating?: string | null;
    reviews?: {
      id: string;
      rating: number;
      review: string;
      studentName: string;
      courseName: string;
      date: string;
    }[];
    department: {
      name: string;
    } | null;
  };
  course: {
    id: string;
    name: string;
    departmentId: string | null;
  };
}

interface Department {
  id: string;
  name: string;
}

export default function FindTutorClient({
  initialExpertises,
  departments,
}: {
  initialExpertises: Expertise[];
  departments: Department[];
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const [activeReviewsTutor, setActiveReviewsTutor] = useState<any>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Focus trap for modal
  useEffect(() => {
    if (activeReviewsTutor) {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements?.[0] as HTMLElement;
      const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

      firstElement?.focus();

      const handleTab = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement?.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement?.focus();
            }
          }
        }
      };

      document.addEventListener('keydown', handleTab);
      return () => document.removeEventListener('keydown', handleTab);
    }
  }, [activeReviewsTutor]);

  const handleModalKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && activeReviewsTutor) {
      setActiveReviewsTutor(null);
    }
  };

  // Filter logic — uses debounced search to avoid filtering on every keystroke
  const filteredExpertises = initialExpertises.filter((exp) => {
    const tutorName = exp.tutor.name.toLowerCase();
    const courseName = exp.course.name.toLowerCase();
    const query = debouncedSearch.toLowerCase();

    const matchesSearch = tutorName.includes(query) || courseName.includes(query);
    const matchesDept = selectedDept === '' || exp.course.departmentId === selectedDept || (exp.tutor.department && exp.tutor.department.name === selectedDept);
    const matchesGender = selectedGender === '' || exp.tutor.gender === selectedGender;

    return matchesSearch && matchesDept && matchesGender;
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Find a Private Tutor</h1>
        <p className={styles.subtitle}>Browse expert tutors for your specific NSU courses</p>
      </div>

      {/* Filter Section */}
      <div className={styles.searchSection}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Search Tutors or Courses</label>
          <input
            type="text"
            placeholder="e.g. CSE115, John Doe..."
            className={styles.input}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Department</label>
          <select
            className={styles.select}
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Gender</label>
          <select
            className={styles.select}
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
          >
            <option value="">Any Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      {/* Results Section */}
      <div className={styles.resultsGrid}>
        {filteredExpertises.length > 0 ? (
          filteredExpertises.map((exp) => (
            <div key={exp.id} className={styles.card}>
              <div>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.tutorName}>{exp.tutor.name}</h3>
                    <div className={styles.tutorDept}>
                      {exp.tutor.department?.name || 'NSU'} Student
                    </div>
                  </div>
                  {exp.tutor.cgpa && (
                    <span className={styles.badgeCGPA}>CGPA {exp.tutor.cgpa.toFixed(2)}</span>
                  )}
                </div>

                <div className={styles.courseHeader}>{exp.course.name}</div>
                
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.9rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: 'var(--text-muted)' }}>
                    🎓 {exp.tutor.studentsTaught || 0} students taught
                  </span>
                  {exp.tutor.averageRating && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#b45309' }}>
                      <span style={{ color: '#fbbf24' }}>★</span> {exp.tutor.averageRating}
                    </span>
                  )}
                </div>

                <ul className={styles.detailsList}>
                  <li>
                    <span>Grade Obtained:</span>
                    <strong>{exp.courseGrade || 'Not specified'}</strong>
                  </li>
                  <li>
                    <span>Taken Under:</span>
                    <strong>{exp.facultyName}</strong>
                  </li>
                  <li>
                    <span>Availability:</span>
                    <strong>{exp.availability}</strong>
                  </li>
                  <li>
                    <span>Session Fee:</span>
                    <strong>{exp.sessionFee} BDT / Session</strong>
                  </li>
                </ul>
              </div>

              <div className={styles.footerActions} style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                <Link
                  href={`/student/request-tutor?courseId=${exp.course.id}&tutorId=${exp.tutor.id}`}
                  className={`btn-primary ${styles.requestBtn}`}
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  Request Tutor for this Course
                </Link>
                {exp.tutor.reviews && exp.tutor.reviews.length > 0 && (
                  <button
                    className="btn"
                    onClick={() => setActiveReviewsTutor(exp.tutor)}
                    style={{ background: '#f1f5f9', color: 'var(--text-main)', width: '100%', textAlign: 'center', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.75rem' }}
                    aria-label={`See ${exp.tutor.reviews.length} review${exp.tutor.reviews.length !== 1 ? 's' : ''} for ${exp.tutor.name}`}
                  >
                    See {exp.tutor.reviews.length} Review{exp.tutor.reviews.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <h3 className={styles.emptyTitle}>No Tutors Found</h3>
            <p className={styles.emptyText}>Try adjusting your search query or filters.</p>
          </div>
        )}
      </div>

      {/* Fallback Section */}
      <div className={styles.fallbackSection}>
        <h2 className={styles.fallbackTitle}>Couldn&apos;t find the right tutor?</h2>
        <p className={styles.fallbackText}>
          Post a custom tutor request and we will notify tutors who meet your criteria.
        </p>
        <Link 
          href="/student/request-tutor" 
          className="btn-primary" 
          style={{ display: 'inline-block', fontSize: '1.1rem', padding: '0.75rem 2rem' }}
        >
          Request a Specific Tutor
        </Link>
      </div>
      
      {/* Reviews Modal */}
      {activeReviewsTutor && (
        <div
          className={styles.modalOverlay}
          onClick={() => setActiveReviewsTutor(null)}
          aria-hidden="true"
        >
          <div
            className={styles.modalContent}
            onClick={e => e.stopPropagation()}
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`modal-title-${activeReviewsTutor.id}`}
            onKeyDown={handleModalKeyDown}
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle} id={`modal-title-${activeReviewsTutor.id}`}>
                Reviews for {activeReviewsTutor.name}
              </h3>
              <button
                className={styles.closeBtn}
                onClick={() => setActiveReviewsTutor(null)}
                aria-label="Close reviews modal"
              >
                ✕
              </button>
            </div>
            <div className={styles.modalBody} role="region" aria-live="polite" aria-atomic="true">
              {activeReviewsTutor.reviews && activeReviewsTutor.reviews.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {activeReviewsTutor.reviews.map((r: any) => (
                    <div key={r.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{r.studentName} <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.85rem' }}>({r.courseName})</span></span>
                        <span style={{ color: '#fbbf24', fontSize: '1.1rem' }}>
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)', fontStyle: 'italic' }}>
                        {r.review ? `"${r.review}"` : 'No written review provided.'}
                      </p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'right' }}>
                        {new Date(r.date).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', margin: '2rem 0' }}>No reviews yet.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
