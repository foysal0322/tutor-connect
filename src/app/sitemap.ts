import type { MetadataRoute } from 'next';

// sitemap.xml — only the public marketing routes are indexable.
// Private dashboards are disallowed in robots.ts and intentionally absent here.
// See FRONTEND_AUDIT.md A9.
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const lastModified = new Date();

  const routes = [
    '',              // home
    '/find-tutor',
    '/consultancy',
    '/contact',
    '/shop',
    '/tutorial',
    '/refund-policy',
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified,
    changeFrequency: route === '' ? 'daily' : 'weekly',
    priority: route === '' ? 1 : route === '/find-tutor' ? 0.9 : 0.6,
  }));
}
