'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
  toggleClass,
  footerLinkClass,
} from '@/components/forms';

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const identifier = formData.get('identifier') as string;
    const password = formData.get('password') as string;

    try {
      // No role is sent — auth.ts lets any non-admin sign in here. Admins must
      // use /auth/admin-signin. A single member can both learn and teach.
      const res = await signIn('credentials', {
        redirect: false,
        identifier,
        password,
      });

      if (res?.error) {
        // Detect our EMAIL_NOT_VERIFIED:<userId> sentinel from authorize
        // and route the user to the verify page instead of leaving them
        // stuck on a generic "auth failed" message.
        const m = res.error.match(/^EMAIL_NOT_VERIFIED:(.+)$/);
        if (m) {
          router.push(`/auth/verify?userId=${m[1]}`);
          return;
        }
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
        title="Welcome back"
        subtitle="Sign in to access your campus dashboard."
        footer={
          <>
            <Link href="/auth/forgot-password" className={footerLinkClass}>
              Forgot Password?
            </Link>
            <div>
              Don&apos;t have an account?{' '}
              <Link
                href={`/auth/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`}
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
              type={showPassword ? 'text' : 'password'}
              label="Password"
              required
              trailingIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className={toggleClass}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              }
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
