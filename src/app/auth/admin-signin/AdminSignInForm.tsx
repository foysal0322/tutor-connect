'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/Input';
import { ShieldCheck } from 'lucide-react';
import {
  FormPage,
  FormCard,
  FormSection,
  FormSubmit,
  FormAlert,
  fieldClass,
} from '@/components/forms';

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
      role: 'ADMIN',
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push('/admin');
      router.refresh();
    }
  }

  return (
    <FormPage maxWidth="narrow">
      <FormCard icon={<ShieldCheck size={28} />} title="Admin Portal" subtitle="Sign in to manage the platform.">
        {error && <FormAlert>{error}</FormAlert>}

        <form onSubmit={handleSubmit} noValidate>
          <FormSection label="Admin Credentials" icon={<ShieldCheck size={14} />} columns={1}>
            <Input
              containerClassName={fieldClass}
              name="identifier"
              type="email"
              label="Admin Email"
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

          <FormSubmit loading={loading} loadingText="Signing in..." icon={<ShieldCheck size={18} />}>
            Sign In as Admin
          </FormSubmit>
        </form>
      </FormCard>
    </FormPage>
  );
}
