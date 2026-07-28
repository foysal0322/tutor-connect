'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { LogIn } from 'lucide-react';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  footerLinkClass,
} from '@/components/forms';

export default function StudentSignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const callbackUrl = searchParams.get('callbackUrl') || '/student';

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get('identifier') as string;
    const password = formData.get('password') as string;

    try {
      const res = await signIn('credentials', {
        redirect: false,
        identifier,
        password,
        role: 'STUDENT',
      });

      if (res?.error) {
        setError(`Authentication failed: ${res.error}`);
        setLoading(false);
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred during sign in.';
      setError(errorMessage);
      setLoading(false);
      console.error('Sign in error:', err);
    }
  }

  return (
    <FormPage maxWidth="narrow">
      <FormCard
        icon={<LogIn size={28} />}
        title="Campus Account Sign In"
        subtitle="Welcome back! Access your dual-role Learning & Teaching dashboard."
        footer={
          <>
            <Link href="/auth/forgot-password" className={footerLinkClass}>
              Forgot Password?
            </Link>
            <div>
              Don&apos;t have an account?{' '}
              <Link
                href={`/auth/student-register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
                className={footerLinkClass}
              >
                Register Here
              </Link>
            </div>
          </>
        }
      >
        {registered && <FormAlert tone="success">Registration successful! Please sign in.</FormAlert>}
        {error && <FormAlert>{error}</FormAlert>}

        <form onSubmit={handleSubmit} noValidate>
          <FormSection label="Your Credentials" icon={<LogIn size={14} />} columns={1}>
            <Input
              containerClassName={fieldClass}
              name="identifier"
              type="text"
              label="Email or NSU ID"
              required
            />
            <Input
              containerClassName={fieldClass}
              name="password"
              type="password"
              label="Password"
              required
            />
          </FormSection>

          <FormSubmit loading={loading} loadingText="Signing in..." icon={<LogIn size={18} />}>
            Sign In
          </FormSubmit>
        </form>
      </FormCard>
    </FormPage>
  );
}
