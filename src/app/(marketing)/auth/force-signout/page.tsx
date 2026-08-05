'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut } from 'lucide-react';
import styles from './force-signout.module.css';

const REASONS: Record<string, { title: string; description?: string; hint?: string }> = {
  'session-expired': {
    title: 'Session expired',
    description: 'Your session is no longer valid. Please sign in again to continue.',
    hint: 'Securing your account',
  },
  'role-changed': {
    title: 'Account role changed',
    description: 'Your account role has been updated. Please sign in again to refresh your access.',
    hint: 'Refreshing permissions',
  },
  'security-event': {
    title: 'Signed out for security',
    description:
      'We detected unusual activity on your account. Please sign in again to verify it was you.',
    hint: 'Protecting your account',
  },
  // Manual logout: minimal copy — just "Signing you out" + animated loader.
  manual: {
    title: 'Signing you out',
    hint: 'See you soon',
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
    <main className={styles.page}>
      <div
        className={styles.card}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
      >
        {/* Animated loader: pulsing orb with three radiating ripple rings
            and a static logout glyph centered inside. */}
        <div className={styles.loaderWrap} aria-hidden="true">
          <span className={`${styles.ring} ${styles.ring1}`} />
          <span className={`${styles.ring} ${styles.ring2}`} />
          <span className={`${styles.ring} ${styles.ring3}`} />
          <div className={styles.orb}>
            <LogOut size={26} strokeWidth={2.25} />
          </div>
        </div>

        <h1 className={styles.title}>{meta.title}</h1>
        {meta.description && (
          <p className={styles.description}>{meta.description}</p>
        )}
        {meta.hint && (
          <span className={styles.hint}>
            <span className={styles.hintDot} />
            {meta.hint}
          </span>
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
