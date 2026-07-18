import Link from 'next/link';
import { BookOpen, GraduationCap, ShoppingBag, Star } from 'lucide-react';
import styles from './home.module.css';

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={`container ${styles.heroGrid}`}>
        <div className={styles.heroContent}>
          <div className={styles.heroTag}>✨ The #1 Platform for NSUers</div>
          <h1 className={styles.heroTitle}>
            Everything an NSUer Needs, <span>All in One Place.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Find tutors, become a tutor, get academic guidance from seniors, and soon access exclusive student services—all from a single platform built for the NSU community.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/find-tutor" className="btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
              Find a Tutor
            </Link>
            <Link href="/auth/tutor-register" className="btn-outline" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
              Become a Tutor
            </Link>
          </div>
        </div>
        
        <div className={styles.heroIllustration}>
          <div className={`${styles.floatingCard} ${styles.floatingCard1}`}>
            <div className={styles.floatingCardIcon} style={{ background: 'rgba(79, 70, 229, 0.1)', color: '#4f46e5' }}>
              <BookOpen size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Expert Tutors</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>100+ Courses</div>
            </div>
          </div>
          
          <div className={`${styles.floatingCard} ${styles.floatingCard2}`}>
            <div className={styles.floatingCardIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
              <GraduationCap size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>Consultancy</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Free Guidance</div>
            </div>
          </div>
          
          <div className={`${styles.floatingCard} ${styles.floatingCard3}`}>
            <div className={styles.floatingCardIcon} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
              <Star size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>4.9/5 Rating</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Student Reviews</div>
            </div>
          </div>
          
          <div className={`${styles.floatingCard} ${styles.floatingCard4}`}>
            <div className={styles.floatingCardIcon} style={{ background: 'rgba(236, 72, 153, 0.1)', color: '#ec4899' }}>
              <ShoppingBag size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 700 }}>One Shop</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Coming Soon</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
