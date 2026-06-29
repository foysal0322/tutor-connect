'use client';

import { useState } from 'react';
import styles from '../../dashboard.module.css';
import AddExpertiseForm from './AddExpertiseForm';
import { deleteTutorExpertise, toggleTutorExpertise } from '../actions';

export default function ExpertiseDashboard({ expertises, allCourses }: { expertises: any[], allCourses: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const editingExpertise = expertises.find(exp => exp.id === editingId);

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this expertise?')) return;
    setDeletingId(id);
    const res = await deleteTutorExpertise(id);
    if (res?.error) {
      alert(res.error);
    } else {
      if (editingId === id) setEditingId(null);
    }
    setDeletingId(null);
  }

  async function handleToggle(id: string, currentState: boolean) {
    setTogglingId(id);
    const res = await toggleTutorExpertise(id, !currentState);
    if (res?.error) {
      alert(res.error);
    }
    setTogglingId(null);
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
      <div>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>My Offered Courses</h2>
        <div className={styles.card}>
          {expertises.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>You haven't added any course expertise yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {expertises.map(exp => (
                <li key={exp.id} style={{ 
                  padding: '1rem', 
                  border: `2px solid ${editingId === exp.id ? 'var(--primary)' : 'var(--border-color)'}`, 
                  borderRadius: '8px',
                  background: editingId === exp.id ? 'rgba(79, 70, 229, 0.03)' : (exp.isActive ? 'transparent' : '#f9fafb'),
                  opacity: exp.isActive ? 1 : 0.6,
                  transition: 'all 0.2s'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ color: 'var(--primary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {exp.course.name}
                        {!exp.isActive && <span style={{ fontSize: '0.7rem', background: 'var(--text-muted)', color: '#fff', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>DISABLED</span>}
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.25rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', marginRight: '0.5rem' }}>
                        <input 
                          type="checkbox" 
                          checked={exp.isActive}
                          onChange={() => handleToggle(exp.id, exp.isActive)}
                          disabled={togglingId === exp.id}
                          style={{ cursor: 'pointer' }}
                        />
                        Active
                      </label>
                      <button 
                        onClick={() => setEditingId(exp.id)} 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', background: 'var(--bg-main)', border: '1px solid var(--border-color)', borderRadius: '4px', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDelete(exp.id)}
                        disabled={deletingId === exp.id}
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', cursor: 'pointer', background: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', fontWeight: 600 }}
                      >
                        {deletingId === exp.id ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <p><strong>Grade:</strong> {exp.courseGrade}</p>
                    <p><strong>Faculty:</strong> {exp.facultyName}</p>
                    <p><strong>Availability:</strong> {exp.availability}</p>
                    <p><strong>Fee:</strong> {exp.sessionFee} BDT / session</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem' }}>
          {editingId ? 'Edit Expertise' : 'Add New Expertise'}
        </h2>
        {editingId && editingExpertise ? (
          <AddExpertiseForm 
            courses={allCourses} 
            initialData={editingExpertise} 
            onSuccess={() => setEditingId(null)}
            onCancel={() => setEditingId(null)} 
          />
        ) : (
          <AddExpertiseForm courses={allCourses} />
        )}
      </div>
    </div>
  );
}
