"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store } from "lucide-react";
import NotificationBell from "./NotificationBell";
import UserMenu from "./UserMenu";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import styles from "./Navbar.module.css";

export default function NavbarClient({ session }: { session: any }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  // Trap focus inside the mobile menu while it's open; restore to the trigger on close.
  useFocusTrap(mobileNavRef, isMobileMenuOpen);

  const pathname = usePathname();

  // Resolve the dashboard href once so the link and its active state stay
  // in sync. Teaching entry point intentionally has no separate navbar slot
  // for signed-in users — the unified Dashboard's Teaching tab covers it
  // (dual-role model: one member can both learn and teach).
  const dashboardHref =
    session?.user?.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";

  // Signed-in users get bounced from `/` to their dashboard by src/proxy.ts;
  // `?home=1` is the escape hatch that lets them view the marketing page.
  const homeHref = session ? "/?home=1" : "/";

  // A nav item is active when we are on its exact route or a child of it.
  // "/" is exact-only so it never matches every page.
  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const activeClass = (href: string) =>
    isActive(href)
      ? `${styles.navLink} ${styles.navLinkActive}`
      : styles.navLink;

  return (
    <nav className={styles.navbar}>
      <div className={`container ${styles.navContainer}`}>
        <Link
          href='/'
          className={styles.logo}
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <span className={styles.logoHighlight}>nsu</span>One
        </Link>

        <div
          ref={mobileNavRef}
          className={`${styles.navLinks} ${isMobileMenuOpen ? styles.navLinksOpen : ""}`}
          id='mobile-navigation'
          role='navigation'
          aria-label='Main navigation'
        >
          <Link
            href={homeHref}
            className={activeClass("/")}
            aria-current={isActive("/") ? "page" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            href='/find-tutor'
            className={activeClass("/find-tutor")}
            aria-current={isActive("/find-tutor") ? "page" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Find a Tutor
          </Link>
          <Link
            href='/shop'
            className={activeClass("/shop")}
            aria-current={isActive("/shop") ? "page" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <Store size={14} aria-hidden='true' style={{ marginRight: 4, verticalAlign: '-2px' }} />
            Shop
          </Link>
          {!session && (
            <Link
              href='/auth/register'
              className={activeClass("/auth/register")}
              aria-current={
                isActive("/auth/register") ? "page" : undefined
              }
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Become a Tutor
            </Link>
          )}
          <Link
            href='/tutorial'
            className={activeClass("/tutorial")}
            aria-current={isActive("/tutorial") ? "page" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Tutorial
          </Link>
          <Link
            href='/contact'
            className={activeClass("/contact")}
            aria-current={isActive("/contact") ? "page" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Contact
          </Link>
          <Link
            href='/consultancy'
            className={
              isActive("/consultancy")
                ? `${styles.navLink} ${styles.navLinkHot} ${styles.navLinkActive}`
                : `${styles.navLink} ${styles.navLinkHot}`
            }
            aria-current={isActive("/consultancy") ? "page" : undefined}
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Free Consultancy
          </Link>

          <div className={`${styles.authButtonsMobile}`}>
            {!session ? (
              <Link
                href='/auth/signin'
                className={styles.btnTutorSignIn}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Sign in
              </Link>
            ) : (
              <>
                <NotificationBell />
                <UserMenu
                  user={session.user}
                  variant='inline'
                  onNavigate={() => setIsMobileMenuOpen(false)}
                />
              </>
            )}
          </div>
        </div>

        <div className={styles.authButtonsDesktop}>
          {!session ? (
            <Link href='/auth/signin' className={styles.btnTutorSignIn}>
              Sign in
            </Link>
          ) : (
            <>
              <NotificationBell />
              <Link
                href={dashboardHref}
                className={
                  isActive(dashboardHref)
                    ? `${styles.dashboardInline} ${styles.dashboardInlineActive}`
                    : styles.dashboardInline
                }
                aria-current={isActive(dashboardHref) ? "page" : undefined}
              >
                <LayoutDashboard size={16} aria-hidden='true' />
                Dashboard
              </Link>
              <UserMenu user={session.user} />
            </>
          )}
        </div>

        <button
          className={styles.mobileMenuBtn}
          onClick={toggleMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls='mobile-navigation'
          aria-haspopup='true'
        >
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='24'
            height='24'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
          >
            {isMobileMenuOpen ? (
              <>
                <line x1='18' y1='6' x2='6' y2='18'></line>
                <line x1='6' y1='6' x2='18' y2='18'></line>
              </>
            ) : (
              <>
                <line x1='3' y1='12' x2='21' y2='12'></line>
                <line x1='3' y1='6' x2='21' y2='6'></line>
                <line x1='3' y1='18' x2='21' y2='18'></line>
              </>
            )}
          </svg>
        </button>
      </div>
    </nav>
  );
}
