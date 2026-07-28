import Link from 'next/link';
import { ArrowRight, GraduationCap } from 'lucide-react';
import styles from './home.module.css';

export default function FinalCta() {
  return (
    <section className={styles.finalCta} aria-label="Get started">
      <div className={styles.finalCtaGlow + ' ' + styles.finalCtaGlowA} aria-hidden="true" />
      <div className={styles.finalCtaGlow + ' ' + styles.finalCtaGlowB} aria-hidden="true" />

      <div className={styles.finalCtaInner}>
        <h2 className={styles.finalCtaTitle}>
          Ready to make your university life easier?
        </h2>
        <p className={styles.finalCtaLede}>
          Join thousands of NSUers already using nsuOne to find tutors, offer
          classes, and navigate their academic journey.
        </p>

        <div className={styles.finalCtaActions}>
          <Link href="/find-tutor" className={styles.ctaPrimary}>
            Find a Tutor
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/auth/tutor-register" className={styles.ctaSecondary}>
            <GraduationCap size={18} aria-hidden="true" />
            Become a Tutor
          </Link>
        </div>
      </div>
    </section>
  );
}
