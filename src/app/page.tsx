import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import styles from './page.module.css';
import SupportForm from './components/SupportForm';

// Cache homepage data for 5 minutes — stats don't need to be real-time
export const revalidate = 300;

export default async function Home() {
  // Batch both queries in parallel — only fetch columns we actually render
  const [requests, tutors] = await Promise.all([
    prisma.tutorRequest.findMany({
      where: { status: 'PENDING' },
      select: {
        id: true,
        topic: true,
        preferredMode: true,
        preferredDateTime: true,
        budget: true,
        createdAt: true,
        course: {
          select: {
            name: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
    prisma.user.findMany({
      where: { role: 'TUTOR' },
      select: {
        id: true,
        name: true,
        cgpa: true,
        expertises: {
          where: { isActive: true },
          select: {
            sessionFee: true,
            course: { select: { name: true } }
          },
          take: 3,
        }
      },
      take: 6,
    }),
  ]);

  // Mock student reviews
  const reviews = [
    { id: 1, name: 'Alice Rahman', course: 'CSE115', rating: 5, comment: 'Amazing tutor! Explained pointers very clearly.' },
    { id: 2, name: 'Tarik Islam', course: 'MAT120', rating: 5, comment: 'Helped me get an A in Calculus. Highly recommended.' },
    { id: 3, name: 'Sara Khan', course: 'ACT201', rating: 4, comment: 'Very patient and provided great practice materials.' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Ace Your Courses with <span>NSU Tutor Connect</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Find the perfect private tutor for your specific NSU courses, or share your knowledge and earn as a tutor.
          </p>
          <div className={styles.heroButtons}>
            <Link href="/find-tutor" className="btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
              Find a Tutor
            </Link>
            <Link href="/auth/tutor-register" className="btn-outline" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }}>
              Be a Tutor
            </Link>
          </div>
        </div>
      </section>

      {/* Requested Courses Section */}
      <section className={`${styles.section} container`}>
        <h2 className={styles.sectionTitle}>Students Looking for Tutors</h2>
        
        {requests.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>No active tutor requests right now.</h3>
            <p>Check back later or become a tutor to be notified!</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {requests.map((req) => (
              <div key={req.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.courseName}>{req.course.name}</h3>
                  <span className={styles.badge}>{req.budget} BDT</span>
                </div>
                <div className={styles.cardBody}>
                  <p><strong>Topic:</strong> {req.topic}</p>
                  <p><strong>Dept:</strong> {req.course.department?.name || 'N/A'}</p>
                  <p><strong>Mode:</strong> {req.preferredMode}</p>
                  {req.preferredDateTime && (
                    <p><strong>Time:</strong> {new Date(req.preferredDateTime).toLocaleString()}</p>
                  )}
                  <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}>
                    Requested: {new Date(req.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Available Tutors Section */}
      <section className={`${styles.section} container`} style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '4rem 2rem' }}>
        <h2 className={styles.sectionTitle}>Meet Our Top Tutors</h2>
        
        {tutors.length === 0 ? (
          <div className={styles.emptyState}>
            <h3>New tutors are joining soon.</h3>
            <p>Be the first to join as a tutor and get students!</p>
          </div>
        ) : (
          <div className={styles.grid}>
            {tutors.map((tutor) => (
              <div key={tutor.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.courseName}>{tutor.name}</h3>
                  <span className={styles.badge}>CGPA: {tutor.cgpa}</span>
                </div>
                <div className={styles.cardBody}>
                  <p><strong>Expertise:</strong> {tutor.expertises.map(e => e.course.name.split(':')[0]).join(', ') || 'General'}</p>
                  <p><strong>Fee:</strong> {tutor.expertises[0]?.sessionFee || 'Negotiable'} BDT</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Student Reviews */}
      <section className={`${styles.section} container`}>
        <h2 className={styles.sectionTitle}>What Students Say</h2>
        <div className={styles.reviewsCarousel}>
          {reviews.map((review) => (
            <div key={review.id} className={`${styles.card} ${styles.reviewCard}`}>
              <div className={styles.stars}>
                {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
              </div>
              <div className={styles.cardBody}>
                <p style={{ fontStyle: 'italic', marginBottom: '1rem' }}>"{review.comment}"</p>
                <p><strong>{review.name}</strong> - {review.course}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Support / Contact Section */}
      <section id="support" className={`${styles.section} container`} style={{ backgroundColor: 'var(--card-bg)', borderRadius: 'var(--radius)', padding: '4rem 2rem', marginBottom: '4rem' }}>
        <h2 className={styles.sectionTitle}>We Value Your Feedback</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '1rem', maxWidth: '600px', margin: '0 auto 1rem' }}>
          Have a suggestion, want to file a complaint, or need a refund? Let us know below and our admins will get back to you.
        </p>
        <p style={{ textAlign: 'center', color: 'var(--text-main)', fontWeight: 600, marginBottom: '2rem', maxWidth: '600px', margin: '0 auto 2rem' }}>
          For any urgent query call: <a href="tel:01711223344" style={{ color: 'var(--primary)' }}>01711223344</a>
        </p>
        <SupportForm />
      </section>
    </div>
  );
}
