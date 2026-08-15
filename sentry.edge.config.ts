// Sentry Edge runtime configuration.
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'edge'.

import * as Sentry from '@sentry/nextjs';

// Skip Sentry entirely when no DSN is configured (local dev without Sentry
// env vars) to avoid tracing/tunnel overhead on every request.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Tracing sampled only in production; tracing every request in dev made
    // local development noticeably slower. Errors are still captured in dev.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

    enableLogs: true,
  });
}
