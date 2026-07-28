'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { registerUser } from '../actions';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { GraduationCap, Lock, User } from 'lucide-react';
import { useZodForm } from '@/hooks/useZodForm';
import { registerUserSchema } from '@/lib/validation';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  footerLinkClass,
} from '@/components/forms';

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
    <FormPage>
      <FormCard
        icon={<GraduationCap size={28} />}
        title="Tutor Registration"
        subtitle="Join our community and start teaching."
        footer={
          <div>
            Already have an account?{' '}
            <Link href="/auth/tutor-signin" className={footerLinkClass}>
              Sign In
            </Link>
          </div>
        }
      >
        {error && <FormAlert>{error}</FormAlert>}

        <form action={handleSubmit} noValidate>
          {/* Section: Personal */}
          <FormSection label="Personal Details" icon={<User size={14} />}>
            <Input
              containerClassName={fieldClass}
              name="name"
              type="text"
              label="Full Name"
              required
              error={form.errors.name}
              onChange={form.onChange('name')}
              onBlur={form.onBlur('name')}
            />
            <Input
              containerClassName={fieldClass}
              name="nsuId"
              type="text"
              label="NSU ID"
              placeholder="e.g. 2211458642"
              required
              error={form.errors.nsuId}
              onChange={form.onChange('nsuId')}
              onBlur={form.onBlur('nsuId')}
            />
            <Input
              containerClassName={fieldClass}
              name="email"
              type="email"
              label="University Email"
              placeholder="you@nsu.edu"
              required
              error={form.errors.email}
              onChange={form.onChange('email')}
              onBlur={form.onBlur('email')}
            />
            <Input
              containerClassName={fieldClass}
              name="contact"
              type="text"
              label="Contact Number"
              placeholder="017XXXXXXXX"
              hint="11-digit BD mobile"
              required
              error={form.errors.contact}
              onChange={form.onChange('contact')}
              onBlur={form.onBlur('contact')}
            />
            <Select
              containerClassName={fieldClass}
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
          </FormSection>

          {/* Section: Academic */}
          <FormSection label="Academic Details" icon={<GraduationCap size={14} />}>
            <Select
              containerClassName={fieldClass}
              name="departmentId"
              label="Department"
              required
              placeholderOption="Select department"
              options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
              error={form.errors.departmentId}
            />
            <Input
              containerClassName={fieldClass}
              name="cgpa"
              type="number"
              step="any"
              min="0"
              max="4.0"
              label="CGPA"
              placeholder="e.g. 3.50"
              hint="Between 0 and 4"
              required
              error={form.errors.cgpa}
              onChange={form.onChange('cgpa')}
              onBlur={form.onBlur('cgpa')}
            />
          </FormSection>

          {/* Section: Security */}
          <FormSection label="Security" icon={<Lock size={14} />}>
            <Input
              containerClassName={fieldClass}
              name="password"
              type="password"
              label="Password"
              hint="At least 8 characters"
              required
              error={form.errors.password}
              onChange={form.onChange('password')}
              onBlur={form.onBlur('password')}
            />
            <Input
              containerClassName={fieldClass}
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              required
              error={form.errors.confirmPassword}
              onChange={form.onChange('confirmPassword')}
              onBlur={form.onBlur('confirmPassword')}
            />
          </FormSection>

          <FormSubmit loading={loading} loadingText="Registering..." icon={<GraduationCap size={18} />}>
            Register as Tutor
          </FormSubmit>
        </form>
      </FormCard>
    </FormPage>
  );
}
