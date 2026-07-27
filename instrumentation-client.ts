// Sentry client-side configuration (browser bundle).
//
// Next.js auto-loads this file via the instrumentation-client hook — see
// https://docs.sentry.io/platforms/javascript/guides/nextjs/
// Replaces the older sentry.client.config.ts pattern.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // 100% in dev so test errors always land; 10% of production traffic.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with errors.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,

  integrations: [Sentry.replayIntegration()],
});

// Hook App Router navigation transitions for navigation spans.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
