'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '@/components/Spinner';
import FloatingInput from '@/components/ui/FloatingInput';
import { LogIn } from 'lucide-react';

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
      setLoading(false);
    } else {
      router.push('/tutor'); // Redirect to tutor dashboard
      router.refresh();
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center p-6 bg-gray-50/50">
      <div className="card w-full max-w-md p-8 sm:p-10 shadow-lg border-t-4 border-t-primary">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary-light/50 text-primary mb-4">
            <LogIn size={24} />
          </div>
          <h2 className="text-2xl font-bold text-main">Campus Account Sign In</h2>
          <p className="text-muted text-sm mt-2">Welcome back! Access your dual-role Teaching & Learning dashboard.</p>
        </div>
        
        {registered && <div className="bg-success-light text-success-hover p-4 rounded-lg font-medium mb-6 text-sm text-center">Registration successful! Please sign in.</div>}
        {error && <div className="bg-danger-light text-danger-hover p-4 rounded-lg font-medium mb-6 text-sm text-center">{error}</div>}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FloatingInput name="identifier" type="text" label="Email or NSU ID" required />
          <FloatingInput name="password" type="password" label="Password" required />

          <button type="submit" className="btn bg-primary text-white hover:bg-primary-hover px-4 py-3 font-semibold rounded-lg transition-colors w-full flex items-center justify-center gap-2 mt-2" disabled={loading}>
            {loading ? <><Spinner size={18} /> Signing in...</> : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-color text-center flex flex-col gap-3 text-sm">
          <Link href="/auth/forgot-password" className="text-primary hover:text-primary-hover font-semibold transition-colors">Forgot Password?</Link>
          <div className="text-muted">
            Don't have an account? <Link href="/auth/tutor-register" className="text-primary hover:text-primary-hover font-semibold transition-colors ml-1">Register Here</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
