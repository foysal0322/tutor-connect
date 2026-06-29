'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Spinner from '@/components/Spinner';
import styles from '../auth.module.css';

export default function AdminSignInForm() {
  const router = useRouter();
  
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
      role: 'ADMIN'
    });

    if (res?.error) {
      setError(res.error);
    } else {
      router.push('/admin/dashboard');
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <div className={`animate-fade-in ${styles.authContainer}`}>
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>Admin Portal</h2>
        
        {error && <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Admin Email</label>
            <input name="identifier" type="email" required className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Password</label>
            <input name="password" type="password" required className={styles.input} />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading ? <><Spinner size={18} /> Signing in...</> : 'Sign In as Admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
