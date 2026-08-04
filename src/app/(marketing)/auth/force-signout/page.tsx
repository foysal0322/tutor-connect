'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import Spinner from '@/components/Spinner';

const REASONS: Record<string, { title: string; description?: string }> = {
  'session-expired': {
    title: 'Session expired',
    description: 'Your session is no longer valid. Please sign in again to continue.',
  },
  'role-changed': {
    title: 'Account role changed',
    description: 'Your account role has been updated. Please sign in again.',
  },
  'security-event': {
    title: 'Signed out for security',
    description: 'We detected unusual activity on your account. Please sign in again to verify it was you.',
  },
  // Manual logout: keep it minimal — just "Signing you out" + spinner.
  manual: {
    title: 'Signing you out',
  },
};

function ForceSignoutContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? 'session-expired';
  const meta = REASONS[reason] ?? REASONS['session-expired'];
  const isManual = reason === 'manual';

  useEffect(() => {
    signOut({ callbackUrl: '/', redirect: true });
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div
        role="alert"
        aria-live="assertive"
        className="max-w-md w-full text-center"
      >
        {isManual ? (
          <div className="flex flex-col items-center gap-4">
            <Spinner size={36} color="var(--primary)" />
            <h1 className="text-2xl font-semibold tracking-tight">{meta.title}…</h1>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
            {meta.description && (
              <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                {meta.description}
              </p>
            )}
            <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
              Redirecting…
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default function ForceSignoutPage() {
  return (
    <Suspense fallback={null}>
      <ForceSignoutContent />
    </Suspense>
  );
}
