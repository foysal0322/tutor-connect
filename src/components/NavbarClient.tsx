'use client';

import { useState } from 'react';
import Link from 'next/link';
import styles from './Navbar.module.css';

export default function NavbarClient({ session }: { session: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.logo} onClick={() => setIsMobileMenuOpen(false)}>
          <span className={styles.logoHighlight}>NSU</span> Tutor Connect
        </Link>
        
        <div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.navLinksOpen : ''}`}>
          <Link href="/" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/tutorial" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Tutorial</Link>
          <Link href="/#support" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Support</Link>
          <Link href="/refund-policy" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Refund Policy</Link>
          <Link href="/consultancy" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Get Free Consultancy</Link>
        
          <div className={`${styles.authButtonsMobile}`}>
            {!session ? (
              <>
                <Link href="/auth/student-signin" className="btn-outline" onClick={() => setIsMobileMenuOpen(false)}>Student Sign In</Link>
                <Link href="/auth/tutor-signin" className="btn-primary" onClick={() => setIsMobileMenuOpen(false)}>Tutor Sign In</Link>
              </>
            ) : (
              <Link href={`/${(session.user as any).role.toLowerCase()}${((session.user as any).role === 'ADMIN' ? '/dashboard' : '')}`} className="btn-primary" onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
            )}
          </div>
        </div>

        <div className={styles.authButtonsDesktop}>
          {!session ? (
            <>
              <Link href="/auth/student-signin" className="btn-outline">Student Sign In</Link>
              <Link href="/auth/tutor-signin" className="btn-primary">Tutor Sign In</Link>
            </>
          ) : (
            <Link href={`/${(session.user as any).role.toLowerCase()}${((session.user as any).role === 'ADMIN' ? '/dashboard' : '')}`} className="btn-primary">Dashboard</Link>
          )}
        </div>

        <button className={styles.mobileMenuBtn} onClick={toggleMenu} aria-label="Toggle menu">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {isMobileMenuOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </>
            ) : (
              <>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </>
            )}
          </svg>
        </button>
      </div>
    </nav>
  );
}
