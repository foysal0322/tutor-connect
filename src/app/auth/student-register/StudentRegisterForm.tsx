'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import { registerUser } from '../actions';
import FloatingInput from '@/components/ui/FloatingInput';
import { UserPlus } from 'lucide-react';

import styles from '../auth.module.css';

export default function StudentRegisterForm({ departments }: { departments: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError('');
    try {
      const res = await registerUser(formData, 'STUDENT');
      if (res?.error) {
        setError(res.error);
      } else {
        const target = `/auth/student-signin?registered=true${callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
        router.push(target);
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-gray-50/50">
      <div className="card w-full max-w-xl p-8 sm:p-10 shadow-lg border-t-4 border-t-primary my-8 bg-white rounded-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-light/50 text-primary mb-4">
            <UserPlus size={24} />
          </div>
          <h2 className="text-2xl font-bold text-main">Campus Member Registration</h2>
          <p className="text-muted text-sm mt-2">Create a dual-role campus account to start finding tutors and teaching courses.</p>
        </div>
        
        {error && <div className="bg-danger-light text-danger-hover p-4 rounded-lg font-medium mb-6 text-sm text-center">{error}</div>}

        <form action={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FloatingInput name="name" type="text" label="Full Name" required />
            <FloatingInput name="nsuId" type="text" label="NSU ID (e.g. 2211458642)" required />
          </div>

          <FloatingInput name="email" type="email" label="University Email" required />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FloatingInput name="contact" type="text" label="Contact Number" required />
            <div className="form-group mb-0">
              <label className="form-label text-sm font-semibold mb-1">Gender</label>
              <select name="gender" required className="form-select">
                <option value=""></option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-group mb-0">
            <label className="form-label text-sm font-semibold mb-1">Department</label>
            <select name="departmentId" required className="form-select">
              <option value=""></option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <FloatingInput name="password" type="password" label="Password" required />
            <FloatingInput name="confirmPassword" type="password" label="Confirm Password" required />
          </div>

          <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-3 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2 mt-4" disabled={loading}>
            {loading ? <><Spinner size={18} /> Registering...</> : 'Create Campus Account'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-color text-center flex flex-col gap-3 text-sm">
          <div className="text-muted">
            Already have an account? <Link href={`/auth/student-signin${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`} className="text-primary hover:text-primary-hover font-semibold transition-colors ml-1">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
