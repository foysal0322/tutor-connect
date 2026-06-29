'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '../actions/passwordReset';
import Spinner from '@/components/Spinner';
import styles from '../auth.module.css';

export default function ForgotPasswordForm() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string, link?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier) return;

    setLoading(true);
    setMessage(null);

    const res = await requestPasswordReset(identifier);
    if (res.success) {
      setMessage({ type: 'success', text: res.message });
      setIdentifier('');
    } else {
      setMessage({ type: 'error', text: res.message });
    }
    
    setLoading(false);
  }

  return (
    <div className={`animate-fade-in ${styles.authContainer}`}>
      <div className={styles.authCard}>
        <h2 className={styles.authTitle}>Forgot Password</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Enter your registered email address or NSU ID to submit a password reset request to the administrator.
        </p>

        {message?.type === 'error' && (
          <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {message.text}
          </div>
        )}

        {message?.type === 'success' && (
          <div style={{ background: '#d1fae5', color: '#047857', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Email or NSU ID</label>
            <input 
              type="text" 
              className={styles.input} 
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. 2012345678 or john@northsouth.edu"
              required 
              disabled={loading}
            />
          </div>

          <button type="submit" className={`btn-primary ${styles.submitBtn}`} disabled={loading || !identifier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading ? <><Spinner size={18} /> Sending Request...</> : 'Send Reset Link'}
          </button>
        </form>

        <div className={styles.authLinks}>
          <Link href="/auth/student-signin">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
