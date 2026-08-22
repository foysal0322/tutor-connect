import type { Metadata } from "next";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { Analytics } from "@vercel/analytics/react";
import { ToastProvider } from "@/components/ToastProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import GlobalInstallBanner from "@/components/GlobalInstallBanner";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "nsuOne",
  description:
    "Find private tutors for specific courses and topics at North South University.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000",
  ),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    title: "nsuOne",
    statusBarStyle: "default",
    capable: true,
  },
  openGraph: {
    title: "nsuOne",
    description:
      "Find private tutors for specific courses and topics at North South University.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head>
        {/* Set data-theme before first paint. ThemeProvider only applies the
            attribute in a post-hydration effect — without this blocking
            script, dark-mode users see a light flash on every page load. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem("nsuone.theme")==="dark"){document.documentElement.setAttribute("data-theme","dark");document.documentElement.style.colorScheme="dark"}}catch(e){}`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <a href='#main' className='skip-link'>
          Skip to content
        </a>
        <ErrorBoundary context='Root Layout'>
          <ThemeProvider>
            <ToastProvider>
              {/* Vercel Web Analytics replaced the custom VisitorTracker →
                  /api/track-visitor → VisitorLog pipeline (2026-08-22).
                  See PRODUCTION_HEALTH_AND_USAGE_AUDIT.md: per-pageview DB
                  writes kept Neon compute awake and the table grew unbounded.
                  Zero server cost; enable in Vercel → project → Analytics. */}
              <Analytics />
              <ServiceWorkerRegister />
              <NextTopLoader color='var(--primary)' showSpinner={false} />
              <GlobalInstallBanner />
              <main id='main' className='site-main'>
                {children}
              </main>
            </ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
