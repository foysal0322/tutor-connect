'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

// requestIdleCallback gives the browser room to paint first; fall back to
// setTimeout on browsers that don't implement it (Safari < 17).
type IdleHandle = number;
type IdleDeadline = { didTimeout: boolean; timeRemaining: () => number };
const requestIdle: (cb: (deadline: IdleDeadline) => void) => IdleHandle =
  typeof window !== 'undefined' && (window as any).requestIdleCallback
    ? (window as any).requestIdleCallback
    : (cb) => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 0 }), 200);
const cancelIdle: (h: IdleHandle) => void =
  typeof window !== 'undefined' && (window as any).cancelIdleCallback
    ? (window as any).cancelIdleCallback
    : (h) => window.clearTimeout(h);

export default function VisitorTracker() {
  const pathname = usePathname();
  const hasTracked = useRef<string | null>(null);

  useEffect(() => {
    // Skip tracking on admin/auth/api routes entirely — the audit recommended
    // ignoring them, and they would otherwise pollute visitor stats.
    if (!pathname) return;
    if (
      pathname.startsWith('/admin') ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api')
    ) {
      return;
    }

    // Dedupe rapid re-renders (React strict mode in dev, etc.).
    if (hasTracked.current === pathname) return;

    const trackVisit = async () => {
      try {
        await fetch('/api/track-visitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: pathname }),
        });
        hasTracked.current = pathname;
      } catch (error) {
        console.error('Failed to track visitor', error);
      }
    };

    // Defer until the browser is idle so tracking never blocks first paint.
    const handle = requestIdle(trackVisit);
    return () => cancelIdle(handle);
  }, [pathname]);

  return null;
}
