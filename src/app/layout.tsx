import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import NextTopLoader from 'nextjs-toploader';
import { ToastProvider } from '@/components/ToastProvider';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent FOIT (flash of invisible text)
  preload: true,
});

export const metadata: Metadata = {
  title: 'NSU Tutor Connect',
  description: 'Find private tutors for specific courses and topics at North South University.',
  metadataBase: new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000'),
  openGraph: {
    title: 'NSU Tutor Connect',
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
      <body className={inter.className} suppressHydrationWarning>
        <ToastProvider>
          <NextTopLoader color="var(--primary)" showSpinner={false} />
          <Navbar />
          <main>
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
