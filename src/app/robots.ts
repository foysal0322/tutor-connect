import type { MetadataRoute } from 'next';

// robots.txt — allow marketing routes, block everything user-facing.
// See FRONTEND_AUDIT.md A9.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/student',
          '/tutor',
          '/auth',
          '/api',
          '/wallet',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
