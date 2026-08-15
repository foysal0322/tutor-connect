// Sentry Node.js server runtime configuration.
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'nodejs'.

import * as Sentry from '@sentry/nextjs';

// Skip Sentry entirely when no DSN is configured (e.g. local dev without
// Sentry env vars) — otherwise every request pays tracing/tunnel overhead
// and /monitoring POSTs hang waiting for sentry.io.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,

    // Tracing sampled only in production; tracing every request in dev made
    // local development noticeably slower. Errors are still captured in dev.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

    // Attach local variable values to stack frames for richer server traces.
    includeLocalVariables: true,

    enableLogs: true,
  });
}
