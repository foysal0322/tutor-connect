// Sentry Node.js server runtime configuration.
// Loaded by instrumentation.ts when NEXT_RUNTIME === 'nodejs'.

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // 100% in dev so test errors always land; 10% of production traffic.
  tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,

  // Attach local variable values to stack frames for richer server traces.
  includeLocalVariables: true,

  enableLogs: true,
});
