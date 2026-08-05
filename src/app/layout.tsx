import type { Metadata } from "next";
import "./globals.css";
import NextTopLoader from "nextjs-toploader";
import { ToastProvider } from "@/components/ToastProvider";
import VisitorTracker from "@/components/VisitorTracker";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "nsuOne",
  description:
    "Find private tutors for specific courses and topics at North South University.",
  metadataBase: new URL(process.env.NEXTAUTH_URL || "http://localhost:3000"),
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
      <body suppressHydrationWarning>
        <a href='#main' className='skip-link'>
          Skip to content
        </a>
        <ErrorBoundary context='Root Layout'>
          <ThemeProvider>
            <ToastProvider>
              <VisitorTracker />
              <NextTopLoader color='var(--primary)' showSpinner={false} />
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
