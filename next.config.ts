import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Compress responses (gzip/brotli) — reduces bandwidth on Vercel
  compress: true,

  // Remove X-Powered-By header — security best practice
  poweredByHeader: false,

  // Image optimization settings
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400, // 24 hours
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128],
  },

  // Allowed dev origins (ngrok for local testing)
  allowedDevOrigins: ['hettie-interludial-untremendously.ngrok-free.dev'],

  // Optimize package imports to reduce bundle size
  experimental: {
    optimizePackageImports: ['bcryptjs'],
  },

  // Pin the Turbopack root to this project to suppress the lockfile warning
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;

