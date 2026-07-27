'use client';

// Root error boundary — catches errors in the root layout itself, where
// route-segment error.tsx cannot reach. Must render its own <html>/<body>.
// See https://nextjs.org/docs/app/api-reference/file-conventions/error

import * as Sentry from '@sentry/nextjs';
import NextError from 'next/error';
import { useEffect } from 'react';

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { digest: error.digest, handler: 'global-error' },
    });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <NextError statusCode={0} />
      </body>
    </html>
  );
}
