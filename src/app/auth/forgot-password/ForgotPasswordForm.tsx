'use client';

import { useState } from 'react';
import Link from 'next/link';
import { requestPasswordReset } from '../actions/passwordReset';
import Spinner from '@/components/Spinner';
import FloatingInput from '@/components/ui/FloatingInput';
import { KeyRound } from 'lucide-react';

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
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-gray-50/50">
      <div className="card w-full max-w-md p-8 sm:p-10 shadow-lg border-t-4 border-t-primary">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-light/50 text-primary mb-4">
            <KeyRound size={24} />
          </div>
          <h2 className="text-2xl font-bold text-main">Forgot Password</h2>
          <p className="text-muted text-sm mt-2 px-2">Enter your registered email address or NSU ID to submit a password reset request to the administrator.</p>
        </div>

        {message?.type === 'error' && (
          <div className="bg-danger-light text-danger-hover p-4 rounded-lg font-medium mb-6 text-sm text-center">
            {message.text}
          </div>
        )}

        {message?.type === 'success' && (
          <div className="bg-success-light text-success-hover p-4 rounded-lg font-medium mb-6 text-sm text-center">
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FloatingInput 
            name="identifier" 
            type="text" 
            label="Email or NSU ID" 
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required 
            disabled={loading}
          />

          <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-3 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2 mt-2" disabled={loading || !identifier}>
            {loading ? <><Spinner size={18} /> Sending Request...</> : 'Send Reset Link'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-color text-center flex flex-col gap-3 text-sm">
          <Link href="/auth/student-signin" className="text-primary hover:text-primary-hover font-semibold transition-colors">Back to Sign In</Link>
        </div>
      </div>
    </div>
  );
}
