import Link from 'next/link';

export default function NotFound() {
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
      <div style={{
        fontSize: '6rem',
        fontWeight: 800,
        color: 'var(--primary)',
        lineHeight: 1,
        marginBottom: '1rem',
      }}>
        404
      </div>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.75rem', color: 'var(--text-main)' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', maxWidth: '400px' }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link href="/" className="btn-primary" style={{ display: 'inline-block' }}>
        ← Back to Home
      </Link>
    </div>
  );
}
