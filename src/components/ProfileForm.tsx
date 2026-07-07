'use client';

import { useState } from 'react';
import { updateUserProfile } from '@/app/actions/user';

export default function ProfileForm({ 
  user, 
  departments = [], 
  isAdmin = false,
  customAction
}: { 
  user: any, 
  departments?: any[], 
  isAdmin?: boolean,
  customAction?: (formData: FormData) => Promise<any>
}) {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    setSuccess(false);
    
    try {
      const actionToRun = customAction || updateUserProfile;
      const res = await actionToRun(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating profile.');
    }
    setLoading(false);
  }

  return (
    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', maxWidth: '600px' }}>
      {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}
      {success && <div style={{ background: '#d1fae5', color: '#047857', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>Profile updated successfully!</div>}

      <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        
        {isAdmin && (
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Role</label>
            <select name="role" defaultValue={user.role} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
              <option value="STUDENT">Student</option>
              <option value="TUTOR">Tutor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Name</label>
          <input name="name" type="text" defaultValue={user.name} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>NSU ID</label>
          <input name="nsuId" type="text" defaultValue={user.nsuId} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Email</label>
          <input name="email" type="email" defaultValue={user.email} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Contact Number</label>
          <input name="contact" type="text" defaultValue={user.contact} required style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Gender</label>
          <select name="gender" defaultValue={user.gender || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Department</label>
          <select name="departmentId" defaultValue={user.departmentId || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }}>
            <option value="">Select Department</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>

        {(user.role === 'TUTOR' || (isAdmin && user.role === 'TUTOR')) && (
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>CGPA</label>
            <input name="cgpa" type="number" step="0.01" min="0" max="4.0" defaultValue={user.cgpa || ''} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)', marginBottom: '0.5rem' }} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              <input type="checkbox" name="hideCgpa" defaultChecked={user.hideCgpa} />
              Hide my CGPA from students
            </label>
          </div>
        )}

        <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)' }} />
        <h4 style={{ marginBottom: '0.5rem' }}>Change Password (Optional)</h4>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>New Password</label>
          <input name="password" type="password" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Confirm New Password</label>
          <input name="confirmPassword" type="password" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-main)', color: 'var(--text-main)' }} />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
          {loading ? 'Updating...' : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}
