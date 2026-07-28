import Link from "next/link";
import { ArrowRight, GraduationCap, Check, Wallet, Clock } from "lucide-react";
import styles from "./home.module.css";

export default function HeroSection() {
  return (
    <section className={styles.hero}>
      <div className={styles.heroGrid}>
        <div className={styles.heroContent}>
          <span className={styles.heroEyebrow}>
            <span className={styles.heroEyebrowDot} aria-hidden='true' />
            Built for the NSU community
          </span>

          <h1 className={styles.heroTitle}>
            Find a tutor, become one, and{" "}
            <span className={styles.heroTitleAccent}>own your semester.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            nsuOne connects NSUers with verified peer tutors, free academic
            consultancy from seniors, and a campus marketplace &mdash; all in
            one place.
          </p>

          <div className={styles.heroActions}>
            <Link href='/find-tutor' className='btn-primary'>
              Find a Tutor
              <ArrowRight size={18} aria-hidden='true' />
            </Link>
            <Link href='/auth/tutor-register' className='btn-outline'>
              <GraduationCap size={18} aria-hidden='true' />
              Become a Tutor
            </Link>
          </div>

          <ul className={styles.heroMicrocopy} aria-label='Why nsuOne'>
            <li className={styles.heroMicrocopyItem}>
              <Check
                size={16}
                className={styles.heroMicrocopyCheck}
                aria-hidden='true'
              />
              Verified NSU tutors
            </li>
            <li className={styles.heroMicrocopyItem}>
              <Check
                size={16}
                className={styles.heroMicrocopyCheck}
                aria-hidden='true'
              />
              Free first consultancy
            </li>
            <li className={styles.heroMicrocopyItem}>
              <Check
                size={16}
                className={styles.heroMicrocopyCheck}
                aria-hidden='true'
              />
              Pay how you already pay
            </li>
          </ul>
        </div>

        {/* Composed product mock — pure CSS, no external image. */}
        <div className={styles.heroVisual} aria-hidden='true'>
          <div className={styles.mockCard}>
            <div className={styles.mockHeader}>
              <span className={styles.mockTag}>Tutor Request</span>
              <span className={styles.mockStatus}>
                <span className={styles.mockStatusDot} />
                Match pending
              </span>
            </div>

            <div className={styles.mockCourseRow}>
              <div>
                <div className={styles.mockCourseCode}>
                  CSE 115 &middot; ECE Dept
                </div>
                <div className={styles.mockCourseName}>
                  Programming Fundamentals
                </div>
              </div>
              <div className={styles.mockAvatar}>R</div>
            </div>

            <p className={styles.mockTopic}>
              Need help understanding pointers and dynamic memory before
              midterms.
            </p>

            <div className={styles.mockMetaRow}>
              <div className={styles.mockMeta}>
                <span className={styles.mockMetaLabel}>Budget</span>
                <span className={styles.mockMetaValue}>
                  <Wallet size={14} /> 600 BDT
                </span>
              </div>
              <div className={styles.mockMeta}>
                <span className={styles.mockMetaLabel}>When</span>
                <span className={styles.mockMetaValue}>
                  <Clock size={14} /> Sun, 4:00 PM
                </span>
              </div>
            </div>

            <div className={styles.mockFooter}>
              <div>
                <span className={styles.mockPrice}>600</span>
                <span className={styles.mockPriceUnit}>BDT / session</span>
              </div>
              <span className={styles.mockPayChip}>bKash &middot; locked</span>
            </div>
          </div>

          <div className={`${styles.mockBubble} ${styles.mockBubbleTop}`}>
            <span
              className={styles.mockBubbleIcon}
              style={{ background: "var(--success)" }}
            >
              <Check size={14} />
            </span>
            Payment secured
          </div>

          <div className={`${styles.mockBubble} ${styles.mockBubbleBottom}`}>
            <span
              className={styles.mockBubbleIcon}
              style={{ background: "var(--primary)" }}
            >
              <GraduationCap size={14} />
            </span>
            350+ tutors
          </div>
        </div>
      </div>
    </section>
  );
}
