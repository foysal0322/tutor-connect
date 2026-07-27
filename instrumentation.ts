// Next.js instrumentation hook — runs once on server boot.
//
// Dispatches to the correct Sentry runtime config:
//   NEXT_RUNTIME === 'nodejs' -> sentry.server.config.ts
//   NEXT_RUNTIME === 'edge'   -> sentry.edge.config.ts
// The browser bundle is wired separately via instrumentation-client.ts.

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Automatically capture unhandled server-side request errors (App Router).
// Requires @sentry/nextjs >= 8.28.0.
export const onRequestError = Sentry.captureRequestError;
