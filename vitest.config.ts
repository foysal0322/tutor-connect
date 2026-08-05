import { defineConfig } from 'vitest/config';
import path from 'node:path';

// Minimal vitest config — Phase 13.
//
// Scope: unit tests on pure logic (preferences resolver, future helpers).
// Integration / e2e tests of the full notification flow are covered by the
// manual regression checklist at docs/notifications.md — adding Playwright
// is a separate infrastructure decision.
//
// The `alias` mirrors the Next.js `@/*` path so imports like
// `@/lib/notifications/preferences` resolve correctly under vitest.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Exclude node_modules and any stray .next artifacts.
    exclude: ['**/node_modules/**', '**/.next/**'],
  },
});
