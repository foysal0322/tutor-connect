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
      role: 'TUTOR',
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push('/tutor');
      router.refresh();
    }
  }

  return (
    <FormPage maxWidth="narrow">
      <FormCard
        icon={<LogIn size={28} />}
        title="Campus Account Sign In"
        subtitle="Welcome back! Access your dual-role Teaching & Learning dashboard."
        footer={
          <>
            <Link href="/auth/forgot-password" className={footerLinkClass}>
              Forgot Password?
            </Link>
            <div>
              Don&apos;t have an account?{' '}
              <Link href="/auth/tutor-register" className={footerLinkClass}>
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
