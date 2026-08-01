'use client';

import { useEffect } from 'react';
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

// Per-session dedupe: survives Fast Refresh remounts and hard refreshes within
// the same tab session, so each unique path is tracked once per session instead
// of once per mount. Reduces dev DB writes from HMR and prod duplicate writes
// from same-session revisits, without losing analytics signal.
const SESSION_KEY = 'tc:tracked-paths';
function readTrackedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    return new Set<string>(JSON.parse(sessionStorage.getItem(SESSION_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}
function writeTrackedSet(set: Set<string>) {
  try {
    // Cap the set size so a long session can't blow sessionStorage's quota.
    sessionStorage.setItem(SESSION_KEY, JSON.stringify([...set].slice(-200)));
  } catch {
    /* quota exceeded — non-fatal, skip persistence */
  }
}

export default function VisitorTracker() {
  const pathname = usePathname();

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

    const tracked = readTrackedSet();
    if (tracked.has(pathname)) return;

    const trackVisit = async () => {
      try {
        await fetch('/api/track-visitor', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: pathname }),
        });
        tracked.add(pathname);
        writeTrackedSet(tracked);
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
