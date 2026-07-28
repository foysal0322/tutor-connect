'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '../actions';
import Spinner from '@/components/Spinner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GraduationCap } from 'lucide-react';
import { useZodForm } from '@/hooks/useZodForm';
import { registerUserSchema } from '@/lib/validation';

import styles from '../auth.module.css';

export default function TutorRegisterForm({ departments }: { departments: any[] }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const form = useZodForm(registerUserSchema);

  async function handleSubmit(formData: FormData) {
    if (!form.validateAll(formData)) return;
    setLoading(true);
    setError('');
    try {
      const res = await registerUser(formData, 'TUTOR');
      if (res?.error) {
        setError(res.error);
      } else {
        router.push('/auth/tutor-signin?registered=true');
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
            <GraduationCap size={24} />
          </div>
          <h2 className="text-2xl font-bold text-main">Tutor Registration</h2>
          <p className="text-muted text-sm mt-2">Join our community and start teaching.</p>
        </div>

        {error && <div className="bg-danger-light text-danger-hover p-4 rounded-lg font-medium mb-6 text-sm text-center">{error}</div>}

        <form action={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input name="name" type="text" label="Full Name" required
              error={form.errors.name} onChange={form.onChange('name')} onBlur={form.onBlur('name')} />
            <Input name="nsuId" type="text" label="NSU ID (e.g. 2211458642)" required
              error={form.errors.nsuId} onChange={form.onChange('nsuId')} onBlur={form.onBlur('nsuId')} />
          </div>

          <Input name="email" type="email" label="University Email" required
            error={form.errors.email} onChange={form.onChange('email')} onBlur={form.onBlur('email')} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input name="contact" type="text" label="Contact Number" required hint="11-digit BD mobile (017XXXXXXXX)"
              error={form.errors.contact} onChange={form.onChange('contact')} onBlur={form.onBlur('contact')} />
            <Select
              name="gender"
              label="Gender"
              required
              placeholderOption="Select gender"
              options={[
                { value: 'MALE', label: 'Male' },
                { value: 'FEMALE', label: 'Female' },
              ]}
              error={form.errors.gender}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Select
              name="departmentId"
              label="Department"
              required
              placeholderOption="Select department"
              options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
              error={form.errors.departmentId}
            />
            <Input name="cgpa" type="number" step="any" min="0" max="4.0" label="CGPA (e.g. 3.50)" required hint="Between 0 and 4"
              error={form.errors.cgpa} onChange={form.onChange('cgpa')} onBlur={form.onBlur('cgpa')} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input name="password" type="password" label="Password" required hint="At least 8 characters"
              error={form.errors.password} onChange={form.onChange('password')} onBlur={form.onBlur('password')} />
            <Input name="confirmPassword" type="password" label="Confirm Password" required
              error={form.errors.confirmPassword} onChange={form.onChange('confirmPassword')} onBlur={form.onBlur('confirmPassword')} />
          </div>

          <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-3 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2 mt-4" disabled={loading}>
            {loading ? <><Spinner size={18} /> Registering...</> : 'Register as Tutor'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-color text-center flex flex-col gap-3 text-sm">
          <div className="text-muted">
            Already have an account? <Link href="/auth/tutor-signin" className="text-primary hover:text-primary-hover font-semibold transition-colors ml-1">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
