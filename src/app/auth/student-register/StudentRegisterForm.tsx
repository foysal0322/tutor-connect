'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import { registerUser } from '../actions';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Eye, EyeOff, Lock, GraduationCap, User, UserPlus } from 'lucide-react';
import { useZodForm } from '@/hooks/useZodForm';
import { registerUserSchema } from '@/lib/validation';
import styles from './student-register.module.css';

export default function StudentRegisterForm({ departments }: { departments: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '';
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const form = useZodForm(registerUserSchema);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!form.validateAll(formData)) return;
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

  const fieldClass = styles.field;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.card}>
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.iconBadge}>
              <UserPlus size={28} />
            </div>
            <div>
              <h1 className={styles.headerTitle}>Campus Member Registration</h1>
              <p className={styles.headerSub}>
                Create a dual-role account to find tutors and teach courses.
              </p>
            </div>
          </div>

          {error && <div className={styles.alert} role="alert">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            {/* Section: Personal */}
            <section className={styles.section}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionIcon}><User size={14} /></span>
                <span className={styles.sectionText}>Personal Details</span>
                <span className={styles.sectionRule} />
              </div>

              <div className={styles.grid}>
                <Input
                  containerClassName={fieldClass}
                  name="name"
                  type="text"
                  label="Full Name"
                  placeholder="John Doe"
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
                  placeholder="2211458642"
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
              </div>
            </section>

            {/* Section: Academic */}
            <section className={styles.section}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionIcon}><GraduationCap size={14} /></span>
                <span className={styles.sectionText}>Academic Details</span>
                <span className={styles.sectionRule} />
              </div>

              <Select
                containerClassName={fieldClass}
                name="departmentId"
                label="Department"
                required
                placeholderOption="Select department"
                options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
                error={form.errors.departmentId}
              />
            </section>

            {/* Section: Security */}
            <section className={styles.section}>
              <div className={styles.sectionLabel}>
                <span className={styles.sectionIcon}><Lock size={14} /></span>
                <span className={styles.sectionText}>Security</span>
                <span className={styles.sectionRule} />
              </div>

              <div className={styles.grid}>
                <Input
                  containerClassName={fieldClass}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="Password"
                  placeholder="••••••••"
                  hint="At least 8 characters"
                  required
                  error={form.errors.password}
                  onChange={form.onChange('password')}
                  onBlur={form.onBlur('password')}
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className={styles.toggle}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
                <Input
                  containerClassName={fieldClass}
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  label="Confirm Password"
                  placeholder="••••••••"
                  required
                  error={form.errors.confirmPassword}
                  onChange={form.onChange('confirmPassword')}
                  onBlur={form.onBlur('confirmPassword')}
                  trailingIcon={
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className={styles.toggle}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  }
                />
              </div>
            </section>

            <button type="submit" className={styles.submit} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size={18} /> Registering...
                </>
              ) : (
                <>
                  <GraduationCap size={18} /> Create Campus Account
                </>
              )}
            </button>
          </form>

          <div className={styles.footer}>
            <span>Already have an account?</span>
            <Link
              href={`/auth/student-signin${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
              className={styles.footerLink}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
