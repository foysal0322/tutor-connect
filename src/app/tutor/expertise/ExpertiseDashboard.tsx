'use client';

import { useState } from 'react';
import styles from '../../dashboard.module.css';
import AddExpertiseForm from './AddExpertiseForm';
import { deleteTutorExpertise, toggleTutorExpertise } from '../actions';

export default function ExpertiseDashboard({ expertises, allCourses }: { expertises: any[], allCourses: any[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const editingExpertise = expertises.find(exp => exp.id === editingId);
  const showModal = isAdding || editingId !== null;

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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.25rem' }}>My Offered Courses</h2>
        <button 
          onClick={() => setIsAdding(true)} 
          className="btn-primary"
        >
          + Add New Expertise
        </button>
      </div>
      
      <div className={styles.card}>
        {expertises.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You haven't added any course expertise yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {expertises.map(exp => (
              <li key={exp.id} style={{ 
                padding: '1.5rem', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                background: exp.isActive ? 'transparent' : '#f9fafb',
                opacity: exp.isActive ? 1 : 0.6,
                transition: 'all 0.2s'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ color: 'var(--primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
                      {exp.course.name}
                      {!exp.isActive && <span style={{ fontSize: '0.7rem', background: 'var(--text-muted)', color: '#fff', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>DISABLED</span>}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                      <p><strong>Grade:</strong> {exp.courseGrade}</p>
                      <p><strong>Faculty:</strong> {exp.facultyName}</p>
                      <p><strong>Availability:</strong> {exp.availability}</p>
                      <p><strong>Fee:</strong> {exp.sessionFee} BDT</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: '0.25rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', marginRight: '1rem' }}>
                      <input 
                        type="checkbox" 
                        checked={exp.isActive}
                        onChange={() => handleToggle(exp.id, exp.isActive)}
                        disabled={togglingId === exp.id}
                        style={{ cursor: 'pointer', width: '1rem', height: '1rem' }}
                      />
                      Active
                    </label>
                    <button 
                      onClick={() => setEditingId(exp.id)} 
                      className="btn-outline"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(exp.id)}
                      disabled={deletingId === exp.id}
                      className="btn-outline"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', borderColor: '#f87171', color: '#dc2626' }}
                    >
                      {deletingId === exp.id ? '...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal Overlay */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--bg-main)',
            padding: '2rem',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <button 
              onClick={() => { setIsAdding(false); setEditingId(null); }}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: 'var(--text-muted)'
              }}
            >
              &times;
            </button>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: 'var(--text-main)' }}>
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
              <AddExpertiseForm 
                courses={allCourses} 
                onSuccess={() => setIsAdding(false)}
                onCancel={() => setIsAdding(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
