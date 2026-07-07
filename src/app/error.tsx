'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <div style={{
      minHeight: '70vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
        Something went wrong
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '420px' }}>
        An unexpected error occurred. Our team has been notified. You can try refreshing the page or go back to the homepage.
      </p>
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={reset}
          className="btn-primary"
          style={{ display: 'inline-block' }}
        >
          Try Again
        </button>
        <a href="/" className="btn-outline" style={{ display: 'inline-block' }}>
          ← Back to Home
        </a>
      </div>
      {error.digest && (
        <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Error ID: <code style={{ background: 'var(--border-color)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{error.digest}</code>
        </p>
      )}
    </div>
  );
}
