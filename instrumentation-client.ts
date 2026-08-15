// Sentry client-side configuration (browser bundle).
//
// Next.js auto-loads this file via the instrumentation-client hook — see
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Replaces the older sentry.client.config.ts pattern.

import * as Sentry from '@sentry/nextjs';

// Skip Sentry entirely when no DSN is configured (local dev without Sentry
// env vars) — the browser SDK would otherwise POST telemetry to the
// /monitoring tunnel on every page load.
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Tracing sampled only in production; tracing every request in dev made
    // local development noticeably slower. Errors are still captured in dev.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,

    // Session Replay: 10% of all sessions, 100% of sessions with errors.
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    enableLogs: true,

    integrations: [Sentry.replayIntegration()],
  });
}

// Hook App Router navigation transitions for navigation spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
