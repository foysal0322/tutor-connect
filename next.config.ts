import type { NextConfig } from "next";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  // Don't allow anyone to frame the app (clickjacking defense)
  { key: 'X-Frame-Options', value: 'DENY' },
  // Block MIME sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Don't leak the origin to other sites
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Lock down powerful APIs to same-origin only
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  // Force HTTPS for one year once the site is on HTTPS.
  // Subdomains included so auth cookies on *.nsuone patterns stay covered.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Content-Security-Policy:
  //  - default-src 'self' (deny everything not explicitly allowed)
  //  - script-src: 'self' + 'unsafe-inline' (Next.js inlines styles/small scripts;
  //    tighten with nonces later — see FRONTEND_AUDIT.md A7)
  //  - style-src: 'self' 'unsafe-inline' (Next.js inline styles)
  //  - img-src: 'self' data: https: (allow avatars, OG images, etc.)
  //  - font-src: 'self' data:
  //  - connect-src: 'self' (block exfil to third-party origins)
  //  - frame-ancestors 'none' (defense-in-depth alongside X-Frame-Options)
  //  - base-uri 'self', form-action 'self'
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  // Compress responses (gzip/brotli) — reduces bandwidth on Vercel
  compress: true,

  // Remove X-Powered-By header — security best practice
  poweredByHeader: false,

  // Apply the security headers above to every route
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // Image optimization settings
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128],
  },

  // Allowed dev origins (ngrok for local testing)
  allowedDevOrigins: ['hettie-interludial-untremendously.ngrok-free.dev'],

  // Optimize package imports to reduce bundle size and speed up compilation.
  // Each listed package gets per-file granular imports instead of pulling the
  // whole module graph into every file that references it. This is a dev-time
  // and bundling hint — it does not change runtime behavior.
  experimental: {
    optimizePackageImports: [
      'lucide-react', // used across 15+ components — biggest win
      'recharts',     // large chart lib, only used on admin/dashboard
      'date-fns',     // many small fns, benefits from per-fn imports
    ],
  },

  // Pin the Turbopack root to this project to suppress the lockfile warning
  turbopack: {
    root: path.resolve(__dirname),
  },
};

// Source-map upload, ad-block tunneling, and other Sentry build-time wiring.
// org/project/authToken are read from env so the same code works across local,
// CI, and prod without code changes. Source-map upload silently skips when
// SENTRY_AUTH_TOKEN is unset.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  silent: !process.env.CI,
});

