import { Search, GraduationCap, Users, ShoppingBag } from 'lucide-react';
import styles from './home.module.css';
import Link from 'next/link';

export default function CoreFeatures() {
  return (
    <section className={styles.sectionAlt}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Everything You Need to Succeed</h2>
        <p className={styles.sectionSubtitle}>
          Whether you need help with a tough course, want to earn by teaching, or just need some general academic advice from seniors.
        </p>
        
        <div className={styles.featuresGrid}>
          <Link href="/find-tutor" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon}>
                <Search size={28} />
              </div>
              <h3 className={styles.featureTitle}>Find a Tutor</h3>
              <p className={styles.featureText}>
                Struggling with a course? Find experienced tutors who have already aced it. Filter by department, course, or gender to find your perfect match.
              </p>
            </div>
          </Link>
          
          <Link href="/auth/tutor-register" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: 'var(--success-light)', color: 'var(--success)' }}>
                <GraduationCap size={28} />
              </div>
              <h3 className={styles.featureTitle}>Become a Tutor</h3>
              <p className={styles.featureText}>
                Share your knowledge and earn money. Set your own schedule, choose your rates, and help fellow NSUers succeed in their academics.
              </p>
            </div>
          </Link>
          
          <Link href="/consultancy" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className={styles.featureCard}>
              <div className={styles.featureIcon} style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>
                <Users size={28} />
              </div>
              <h3 className={styles.featureTitle}>Free Consultancy</h3>
              <p className={styles.featureText}>
                Not sure which courses to take? Need advice on beating probation? Connect with experienced seniors for free 1-on-1 academic guidance.
              </p>
            </div>
          </Link>
          
          <div className={styles.featureCard} style={{ cursor: 'default' }}>
            <div className={styles.comingSoonOverlay}>
              <span className={styles.heroTag} style={{ marginBottom: 0 }}>Coming Soon</span>
            </div>
            {/* "Coming Soon" decoration — pink is unique to this slot, no semantic token */}
            <div className={styles.featureIcon} style={{ background: 'color-mix(in srgb, var(--accent) 10%, transparent)', color: 'var(--accent-hover)' }}>
              <ShoppingBag size={28} />
            </div>
            <h3 className={styles.featureTitle}>One Shop</h3>
            <p className={styles.featureText}>
              A dedicated student marketplace. Discover useful products, lab equipment, books, and campus services designed specifically for NSUers.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
