'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import styles from '../auth.module.css';

export default function TutorSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get('identifier') as string;
    const password = formData.get('password') as string;

    const res = await signIn('credentials', {
      redirect: false,
      identifier,
      password,
      role: 'TUTOR'
    });

    if (res?.error) {
      setError(res.error);
    } else {
      router.push('/tutor'); // Redirect to tutor dashboard
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className={`animate-fade-in ${styles.authContainer}`}>
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>Tutor Sign In</h2>
        
        {registered && <div style={{ background: '#d1fae5', color: '#047857', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>Registration successful! Please sign in.</div>}
        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email or NSU ID</label>
            <input name="identifier" type="text" required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" required className={styles.input} />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading ? <><Spinner size={18} /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className={styles.authLinks}>
          <Link href="/auth/forgot-password" style={{ display: 'block', marginBottom: '1rem' }}>Forgot Password?</Link>
          Don't have an account? <Link href="/auth/tutor-register">Register Here</Link>
        </div>
      </div>
    </div>
  );
}
