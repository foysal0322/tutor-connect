'use client';

import { useState, useMemo } from 'react';

export default function ExpertiseManager({ expertises }: { expertises: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredExpertises = useMemo(() => {
    if (!searchQuery.trim()) return expertises;
    const lowerQuery = searchQuery.toLowerCase();
    
    return expertises.filter(exp => {
      return (
        exp.tutor.name.toLowerCase().includes(lowerQuery) ||
        exp.course.name.toLowerCase().includes(lowerQuery) ||
        exp.facultyName.toLowerCase().includes(lowerQuery)
      );
    });
  }, [expertises, searchQuery]);

  return (
    <div>
      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
        
        {/* Toolbar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-main)' }}>
          <input 
            type="text" 
            placeholder="Search by course, tutor, or faculty..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', width: '350px' }}
          />
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Total: {filteredExpertises.length} entries
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
            <thead style={{ background: 'var(--bg-main)', borderBottom: '2px solid var(--border-color)' }}>
              <tr>
                <th style={{ padding: '1rem' }}>Tutor Name</th>
                <th style={{ padding: '1rem' }}>Course</th>
                <th style={{ padding: '1rem' }}>Semester</th>
                <th style={{ padding: '1rem' }}>Faculty</th>
                <th style={{ padding: '1rem' }}>Grade</th>
                <th style={{ padding: '1rem' }}>Availability</th>
                <th style={{ padding: '1rem' }}>Fee (BDT)</th>
                <th style={{ padding: '1rem' }}>Added On</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpertises.map(exp => (
                <tr key={exp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem' }}>
                    <strong>{exp.tutor.name}</strong><br/>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{exp.tutor.nsuId}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>{exp.course.name}</td>
                  <td style={{ padding: '1rem' }}>{exp.semesterCompleted}</td>
                  <td style={{ padding: '1rem' }}>{exp.facultyName}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      padding: '0.2rem 0.5rem', 
                      background: 'rgba(79, 70, 229, 0.1)', 
                      color: 'var(--primary)', 
                      borderRadius: '4px',
                      fontWeight: 600
                    }}>
                      {exp.courseGrade}
                    </span>
                  </td>
                  <td style={{ padding: '1rem' }}>{exp.availability}</td>
                  <td style={{ padding: '1rem' }}>{exp.sessionFee}</td>
                  <td style={{ padding: '1rem' }}>{new Date(exp.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredExpertises.length === 0 && (
            <p style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>No expertises found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
