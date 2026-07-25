'use client';

import { useState } from 'react';
import { updateUserProfile } from '@/app/actions/user';
import FloatingInput from '@/components/ui/FloatingInput';

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
    <div className="card max-w-2xl w-full">
      {error && <div className="mb-6 p-4 bg-danger-light text-danger-hover rounded-md font-medium border border-danger-hover">{error}</div>}
      {success && <div className="mb-6 p-4 bg-success-light text-success-hover rounded-md font-medium border border-success-hover">Profile updated successfully!</div>}

      <form action={handleSubmit} className="flex flex-col gap-4">
        
        {isAdmin && (
          <div className="form-group mb-0">
            <label className="form-label">Role</label>
            <select name="role" defaultValue={user.role} className="form-select">
              <option value="STUDENT">Student</option>
              <option value="TUTOR">Tutor</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingInput name="name" label="Full Name" defaultValue={user.name} required />
          <FloatingInput name="nsuId" label="NSU ID" defaultValue={user.nsuId} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingInput name="email" type="email" label="Email Address" defaultValue={user.email} required />
          <FloatingInput name="contact" label="Contact Number" defaultValue={user.contact} required />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group mb-0">
            <label className="form-label text-muted">Gender</label>
            <select name="gender" defaultValue={user.gender || ''} className="form-select">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-muted">Department</label>
            <select name="departmentId" defaultValue={user.departmentId || ''} className="form-select">
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>

        {(user.role !== 'ADMIN' || (isAdmin && user.role !== 'ADMIN')) && (
          <div className="form-group mb-0">
            <FloatingInput 
              name="cgpa" 
              type="number" 
              step="any" 
              min="0" 
              max="4.0" 
              label="CGPA" 
              defaultValue={user.cgpa || ''} 
            />
            <label className="flex items-center gap-2 mt-2 cursor-pointer text-sm text-muted hover:text-main transition-colors">
              <input type="checkbox" name="hideCgpa" defaultChecked={user.hideCgpa} className="w-4 h-4 rounded border-color text-primary focus:ring-primary" />
              Hide my CGPA from students
            </label>
          </div>
        )}

        <div className="my-2 border-t border-color"></div>
        <h4 className="text-lg mb-2">Change Password <span className="text-muted text-sm font-normal">(Optional)</span></h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FloatingInput name="password" type="password" label="New Password" />
          <FloatingInput name="confirmPassword" type="password" label="Confirm New Password" />
        </div>

        <button type="submit" className="btn-primary mt-4 w-full md:w-auto self-start" disabled={loading}>
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Updating...
            </>
          ) : 'Update Profile'}
        </button>
      </form>
    </div>
  );
}
