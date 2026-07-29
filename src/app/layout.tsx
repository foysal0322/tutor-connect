import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import NextTopLoader from 'nextjs-toploader';
import { ToastProvider } from '@/components/ToastProvider';
import VisitorTracker from '@/components/VisitorTracker';
import ErrorBoundary from '@/components/ErrorBoundary';

export const metadata: Metadata = {
  title: 'nsuOne',
  description: 'Find private tutors for specific courses and topics at North South University.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'nsuOne',
    description: 'Find private tutors for specific courses and topics at North South University.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <a href="#main" className="skip-link">Skip to content</a>
        <ErrorBoundary context="Root Layout">
          <ToastProvider>
            <VisitorTracker />
            <NextTopLoader color="var(--primary)" showSpinner={false} />
            <Navbar />
            <main id="main" style={{ minHeight: 'calc(100vh - 400px)' }}>
              {children}
            </main>
            <Footer />
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
