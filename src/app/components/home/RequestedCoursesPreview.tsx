import Link from 'next/link';
import { ArrowRight, Clock, MapPin, Wallet } from 'lucide-react';
import styles from './home.module.css';

type Request = {
  id: string;
  topic: string;
  preferredMode: string;
  preferredDateTime: string | null;
  budget: number;
  createdAt: Date;
  course: {
    name: string;
    department: { name: string } | null;
  };
};

export default function RequestedCoursesPreview({ requests }: { requests: Request[] }) {
  if (requests.length === 0) return null;

  return (
    <section className={styles.sectionAlt + ' ' + styles.section}>
      <div className={styles.sectionInner}>
        <div className={styles.headerRow}>
          <div>
            <span className={styles.eyebrow}>Live demand</span>
            <h2 className={styles.headerRowTitle}>Students looking for tutors right now</h2>
            <p className={styles.headerRowSub}>
              Real, open requests from NSUers. Register as a tutor to apply.
            </p>
          </div>
          <Link href="/auth/tutor-register" className={styles.linkAction}>
            Become a Tutor to Apply
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>

        <div className={styles.requestsGrid}>
          {requests.map((req) => {
            const courseName = req.course.name.split(':')[0].trim();
            return (
              <article key={req.id} className={styles.requestCard}>
                <div>
                  <div className={styles.requestHead}>
                    <h3 className={styles.requestCourse}>{courseName}</h3>
                    <span className={styles.requestDept}>
                      {req.course.department?.name || 'General'}
                    </span>
                  </div>
                  <p className={styles.requestTopic}>
                    <strong>Topic:</strong> {req.topic}
                  </p>
                </div>

                <div>
                  <div className={styles.requestMeta}>
                    <div className={styles.requestMetaRow}>
                      <Wallet size={16} className={styles.requestMetaIcon} aria-hidden="true" />
                      <span><strong>{req.budget.toLocaleString()} BDT</strong> / session</span>
                    </div>
                    <div className={styles.requestMetaRow}>
                      <MapPin size={16} className={styles.requestMetaIcon} aria-hidden="true" />
                      <span>{req.preferredMode}</span>
                    </div>
                    {req.preferredDateTime && (
                      <div className={styles.requestMetaRow}>
                        <Clock size={16} className={styles.requestMetaIcon} aria-hidden="true" />
                        <span>
                          {new Date(req.preferredDateTime).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className={styles.requestDate}>
                    Requested {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
