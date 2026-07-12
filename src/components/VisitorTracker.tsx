'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function VisitorTracker() {
  const pathname = usePathname();
  const hasTracked = useRef<string | null>(null);

  useEffect(() => {
    // Only track if we haven't tracked this path yet in the current session
    // This helps avoid double-tracking in strict mode or rapid navigation
    if (hasTracked.current === pathname) return;

    const trackVisit = async () => {
      try {
        await fetch('/api/track-visitor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ path: pathname }),
        });
        hasTracked.current = pathname;
      } catch (error) {
        console.error('Failed to track visitor', error);
      }
    };

    // Use a small timeout to let the page settle
    const timeout = setTimeout(trackVisit, 500);
    return () => clearTimeout(timeout);
  }, [pathname]);

  return null;
}
