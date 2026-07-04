'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './find-tutor.module.css';

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

  // Filter logic
  const filteredExpertises = initialExpertises.filter((exp) => {
    const tutorName = exp.tutor.name.toLowerCase();
    const courseName = exp.course.name.toLowerCase();
    const query = searchQuery.toLowerCase();

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

                <ul className={styles.detailsList}>
                  <li>
                    <span>Grade Obtained:</span>
                    <strong>{exp.courseGrade}</strong>
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
                    <span>Gender:</span>
                    <strong>{exp.tutor.gender || 'Not Specified'}</strong>
                  </li>
                  <li>
                    <span>Session Fee:</span>
                    <strong>{exp.sessionFee} BDT / Month</strong>
                  </li>
                </ul>
              </div>

              <div className={styles.footerActions}>
                <Link
                  href={`/student/request-tutor?courseId=${exp.course.id}&tutorId=${exp.tutor.id}`}
                  className={`btn-primary ${styles.requestBtn}`}
                  style={{ width: '100%', textAlign: 'center' }}
                >
                  Request Tutor for this Course
                </Link>
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
    </div>
  );
}
