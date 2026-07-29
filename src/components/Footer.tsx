import Link from 'next/link';
import type { SVGProps } from 'react';
import s from './Footer.module.css';

/**
 * Global site footer.
 *
 * Server component — no client interactivity needed (hover/focus are pure CSS
 * via Footer.module.css, which also respects prefers-reduced-motion).
 *
 * Navigation note: /privacy-policy and /terms routes are not implemented yet,
 * so those Legal entries are rendered as muted "Coming soon" affordances
 * (same treatment as One Shop) instead of dead 404 links.
 */

// Kept in sync with package.json. Surface as a quiet build stamp in the bar.
const APP_VERSION = 'v0.1.0';
const YEAR = new Date().getFullYear();

type LinkItem = {
  label: string;
  href?: string;
  soon?: boolean;
};

const PLATFORM_LINKS: LinkItem[] = [
  { label: 'Find a Tutor', href: '/find-tutor' },
  { label: 'Become a Tutor', href: '/auth/tutor-register' },
  { label: 'Get Consultancy', href: '/consultancy' },
  { label: 'One Shop', soon: true },
];

const SUPPORT_LINKS: LinkItem[] = [
  { label: 'Tutorial', href: '/tutorial' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Refund Policy', href: '/refund-policy' },
];

const LEGAL_LINKS: LinkItem[] = [
  { label: 'Privacy Policy', soon: true },
  { label: 'Terms & Conditions', soon: true },
];

const SOCIALS = [
  {
    label: 'nsuOne on Facebook',
    href: 'https://www.facebook.com/nsuOne',
    Icon: FacebookIcon,
  },
  {
    label: 'nsuOne on LinkedIn',
    href: 'https://linkedin.com',
    Icon: LinkedinIcon,
  },
  {
    label: 'Email nsuOne support',
    href: 'mailto:support@nsuone.com',
    Icon: MailIcon,
  },
];

/* Brand/social marks. lucide-react dropped its brand icons, so these are
   inlined as small stroke icons (same 24×24, currentColor convention). */
function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

function LinkedinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function MailIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function Column({ heading, items }: { heading: string; items: LinkItem[] }) {
  return (
    <nav className={s.col} aria-label={heading}>
      <h2 className={s.colHeading}>{heading}</h2>
      <ul className={s.list}>
        {items.map((item) => (
          <li key={item.label}>
            {item.href ? (
              <Link href={item.href} className={s.link}>
                {item.label}
              </Link>
            ) : (
              <span className={s.soon} aria-label={`${item.label} (coming soon)`}>
                {item.label}
                <span className={s.soonPill} aria-hidden="true">Soon</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default function Footer() {
  return (
    <footer className={s.footer}>
      <div className="container">
        <div className={s.grid}>
          {/* Brand */}
          <div className={s.brand}>
            <Link href="/" className={s.logo} aria-label="nsuOne — home">
              <span className={s.logoAccent}>nsu</span>One
            </Link>
            <p className={s.tagline}>Everything an NSUer Needs.</p>
            <p className={s.description}>
              A peer-to-peer campus marketplace where NSUers find tutors, get academic
              support, and soon access more campus services — all in one place.
            </p>
            <ul className={s.socials} aria-label="Social links">
              {SOCIALS.map(({ label, href, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target={href.startsWith('http') ? '_blank' : undefined}
                    rel={href.startsWith('http') ? 'noreferrer' : undefined}
                    className={s.social}
                    aria-label={label}
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <Column heading="Platform" items={PLATFORM_LINKS} />
          <Column heading="Support" items={SUPPORT_LINKS} />
          <Column heading="Legal" items={LEGAL_LINKS} />
        </div>

        {/* Bottom bar */}
        <div className={s.bottom}>
          <p className={s.copy}>
            &copy; {YEAR} nsuOne. All rights reserved.
          </p>
          <p className={s.designed}>Designed for the NSU Community.</p>
          <p className={s.version} aria-label={`Version ${APP_VERSION}`}>
            {APP_VERSION}
          </p>
        </div>
      </div>
    </footer>
  );
}
