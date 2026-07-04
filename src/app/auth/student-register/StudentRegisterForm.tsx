'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import { registerUser } from '../actions';
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
    <div className={`animate-fade-in ${styles.authContainer}`}>
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>Student Registration</h2>
        
        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}

        <form action={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input name="name" type="text" required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>NSU ID</label>
            <input name="nsuId" type="text" required className={styles.input} placeholder="e.g. 2211458642" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>University Email</label>
            <input name="email" type="email" required className={styles.input} placeholder="e.g. name@northsouth.edu" />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Contact Number</label>
            <input name="contact" type="text" required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Gender</label>
            <select name="gender" required className={styles.select}>
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Department</label>
            <select name="departmentId" required className={styles.select}>
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Confirm Password</label>
            <input name="confirmPassword" type="password" required className={styles.input} />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading ? <><Spinner size={18} /> Registering...</> : 'Register as Student'}
          </button>
        </form>

        <div className={styles.authLinks}>
          Already have an account? <Link href={`/auth/student-signin${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}>Sign In</Link>
        </div>
      </div>
    </div>
  );
}
