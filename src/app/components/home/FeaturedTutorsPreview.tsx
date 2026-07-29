import Link from 'next/link';
import { ArrowRight, BadgeCheck } from 'lucide-react';
import styles from './home.module.css';

type Expertise = { sessionFee: number | null; course: { name: string } };
type Tutor = {
  id: string;
  name: string;
  cgpa: number | null;
  expertises: Expertise[];
};

export default function FeaturedTutorsPreview({ tutors }: { tutors: Tutor[] }) {
  if (tutors.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.headerRow}>
          <div>
            <span className={styles.eyebrow}>Verified tutors</span>
            <h2 className={styles.headerRowTitle}>Meet a few of our top Tutors</h2>
            <p className={styles.headerRowSub}>
              Each tutor has cleared our verification and already helped fellow students.
            </p>
          </div>
          <Link href="/find-tutor" className={styles.linkAction}>
            View all tutors
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.tutorsGrid}>
          {tutors.map((tutor) => {
            const startingFee = tutor.expertises
              .map((e) => e.sessionFee)
              .filter((v): v is number => typeof v === 'number')
              .sort((a, b) => a - b)[0];

            return (
              <article key={tutor.id} className={styles.tutorCard}>
                <div className={styles.tutorHead}>
                  <div className={styles.tutorAvatar} aria-hidden="true">
                    {tutor.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className={styles.tutorName}>
                      {tutor.name}
                      <BadgeCheck size={18} color="#10b981" aria-hidden="true" />
                    </h3>
                    <div className={styles.tutorMeta}>
                      CGPA: <strong style={{ color: 'var(--text-main)' }}>{tutor.cgpa ?? '—'}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.tutorExpertise}>
                  <div className={styles.tutorExpertiseLabel}>Expertise</div>
                  <div className={styles.tutorTags}>
                    {tutor.expertises.slice(0, 3).map((e, i) => (
                      <span key={i} className={styles.tutorTag}>
                        {e.course.name.split(':')[0]}
                      </span>
                    ))}
                    {tutor.expertises.length > 3 && (
                      <span className={styles.tutorTagMore}>
                        +{tutor.expertises.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className={styles.tutorFooter}>
                  <div>
                    <div className={styles.tutorFeeLabel}>Starting from</div>
                    <div className={styles.tutorFee}>
                      {startingFee != null ? `${startingFee.toLocaleString()} BDT` : 'Negotiable'}
                    </div>
                  </div>
                  <Link href="/find-tutor" className="btn-outline btn-sm">
                    View profile
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
