'use client';

import { useState } from 'react';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import styles from './Navbar.module.css';

export default function NavbarClient({ session }: { session: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleSupportClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    setIsMobileMenuOpen(false);
    
    // If we are already on the homepage, we can scroll manually
    if (window.location.pathname === '/') {
      e.preventDefault();
      const supportSection = document.getElementById('support');
      if (supportSection) {
        supportSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navContainer}`}>
        <Link href="/" className={styles.logo} onClick={() => setIsMobileMenuOpen(false)}>
          <span className={styles.logoHighlight}>nsu</span>One
        </Link>
        
        <div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.navLinksOpen : ''}`}>
          <Link href="/" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Home</Link>
          <Link href="/find-tutor" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Find a Tutor</Link>
          <Link href={session ? "/tutor/expertise" : "/auth/student-register"} className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>
            {session ? "Teach a Course" : "Register"}
          </Link>
          <Link href="/shop" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>One Shop</Link>
          <Link href="/tutorial" className={styles.navLink} onClick={() => setIsMobileMenuOpen(false)}>Tutorial</Link>
          <Link href="/#support" className={styles.navLink} onClick={handleSupportClick}>Contact</Link>
        
          <div className={`${styles.authButtonsMobile}`}>
            <Link href="/consultancy" className={styles.btnConsultancy} onClick={() => setIsMobileMenuOpen(false)}>Free Consultancy</Link>
            {!session ? (
              <Link href="/auth/student-signin" className={styles.btnTutorSignIn} onClick={() => setIsMobileMenuOpen(false)}>Sign In</Link>
            ) : (
              <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
                <NotificationBell />
                <Link href={`/${(session.user as any).role.toLowerCase()}${((session.user as any).role === 'ADMIN' ? '/dashboard' : '')}`} className={styles.btnTutorSignIn} onClick={() => setIsMobileMenuOpen(false)}>Dashboard</Link>
              </div>
            )}
          </div>
        </div>

        <div className={styles.authButtonsDesktop}>
          <Link href="/consultancy" className={styles.btnConsultancy}>Free Consultancy</Link>
          {!session ? (
            <Link href="/auth/student-signin" className={styles.btnTutorSignIn}>Sign In</Link>
          ) : (
            <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
              <NotificationBell />
              <Link href={`/${(session.user as any).role.toLowerCase()}${((session.user as any).role === 'ADMIN' ? '/dashboard' : '')}`} className={styles.btnTutorSignIn}>Dashboard</Link>
            </div>
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
