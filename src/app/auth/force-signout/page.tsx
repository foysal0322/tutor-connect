'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';

const REASONS: Record<string, { title: string; description: string }> = {
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
  manual: {
    title: 'Signing you out',
    description: 'Clearing your session and returning to the home page.',
  },
};

function ForceSignoutContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') ?? 'session-expired';
  const meta = REASONS[reason] ?? REASONS['session-expired'];

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
        <h1 className="text-2xl font-semibold tracking-tight">{meta.title}</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          {meta.description}
        </p>
        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)' }}>
          Redirecting…
        </p>
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
