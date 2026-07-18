'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      backgroundColor: '#f8fafc',
      borderTop: '1px solid var(--border-color)',
      padding: '4rem 0 2rem 0',
      marginTop: 'auto'
    }}>
      <div className="container" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '3rem',
        marginBottom: '3rem'
      }}>
        {/* Brand Section */}
        <div>
          <Link href="/" style={{
            fontSize: '1.5rem',
            fontWeight: 800,
            color: 'var(--text-main)',
            letterSpacing: '-0.5px',
            textDecoration: 'none',
            display: 'inline-block',
            marginBottom: '1rem'
          }}>
            <span style={{ color: 'var(--primary)' }}>nsu</span>One
          </Link>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
            Everything an NSUer Needs.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {/* Facebook Icon */}
            <a href="https://www.facebook.com/nsuOne" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            {/* LinkedIn Icon */}
            <a href="https://linkedin.com" target="_blank" rel="noreferrer" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
            </a>
            {/* Email Icon */}
            <a href="mailto:support@nsuone.com" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Platform</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li><Link href="/find-tutor" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Find a Tutor</Link></li>
            <li><Link href="/auth/tutor-register" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Become a Tutor</Link></li>
            <li><Link href="/consultancy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Get Consultancy</Link></li>
            <li><span style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem', opacity: 0.7, cursor: 'not-allowed' }}>One Shop (Coming Soon)</span></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Support</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li><Link href="/tutorial" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Tutorial</Link></li>
            <li><Link href="/#support" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Contact Us</Link></li>
            <li><Link href="/refund-policy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Refund Policy</Link></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '1.5rem' }}>Legal</h4>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <li><Link href="/privacy-policy" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Privacy Policy</Link></li>
            <li><Link href="/terms" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.95rem' }}>Terms & Conditions</Link></li>
          </ul>
        </div>
      </div>
      
      <div className="container" style={{
        borderTop: '1px solid var(--border-color)',
        paddingTop: '2rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      }}>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
          &copy; {new Date().getFullYear()} NSUOne. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
