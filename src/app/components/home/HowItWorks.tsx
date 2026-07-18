import { FileText, UserCheck, CreditCard, BookOpen } from 'lucide-react';
import styles from './home.module.css';

export default function HowItWorks() {
  return (
    <section className={styles.section}>
      <div className="container">
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>
          Finding the right tutor and starting your academic journey is simple, secure, and fast.
        </p>

        <div className={styles.timeline}>
          <div className={styles.timelineLine}></div>
          
          <div className={styles.timelineItem}>
            <div className={styles.timelineIcon}>
              <FileText size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>1. Submit Request</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Tell us what course you need help with, your preferred time, and budget.
            </p>
          </div>
          
          <div className={styles.timelineItem}>
            <div className={styles.timelineIcon}>
              <UserCheck size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>2. Admin Matches</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Our team reviews your request and connects you with the perfect, verified tutor.
            </p>
          </div>
          
          <div className={styles.timelineItem}>
            <div className={styles.timelineIcon}>
              <CreditCard size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>3. Secure Payment</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Complete your payment securely via bKash, Nagad, or Rocket to confirm.
            </p>
          </div>
          
          <div className={styles.timelineItem}>
            <div className={styles.timelineIcon}>
              <BookOpen size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>4. Start Learning</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Connect with your tutor online or on campus and ace your course.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
