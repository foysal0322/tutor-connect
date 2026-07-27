'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import ErrorFallback from '@/components/ui/ErrorFallback';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Forward every uncaught route error to Sentry. If SENTRY_DSN is unset
    // this is a no-op. (See FRONTEND_AUDIT.md A10.)
    Sentry.captureException(error, {
      tags: { digest: error.digest, handler: 'app/error.tsx' },
    });

    if (process.env.NODE_ENV === 'development') {
      console.error('Global error:', error);
      if (error.digest) console.error('Error digest:', error.digest);
    }
  }, [error]);

  // Create an enhanced error object with digest info
  const enhancedError = new Error(error.message);
  enhancedError.stack = error.stack;
  if (error.digest) {
    (enhancedError as any).digest = error.digest;
  }

  return (
    <ErrorFallback
      error={enhancedError}
      resetError={reset}
      context="Global Error Handler"
    />
  );
}
