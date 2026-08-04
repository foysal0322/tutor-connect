import SkeletonCard from '@/components/skeletons/SkeletonCard';
import styles from './page.module.css';

export default function HomeLoading() {
  return (
    <div>
      {/* Hero skeleton */}
      <section className={styles.hero} style={{ opacity: 0.5 }}>
        <div className={styles.heroContent}>
          <div className="skeleton" style={{ height: '3rem', width: '70%', margin: '0 auto 1rem', borderRadius: '8px' }} />
          <div className="skeleton" style={{ height: '1.25rem', width: '50%', margin: '0 auto 2rem', borderRadius: '8px' }} />
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <div className="skeleton" style={{ height: '3rem', width: '10rem', borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: '3rem', width: '10rem', borderRadius: '12px' }} />
          </div>
        </div>
      </section>

      {/* Request cards skeleton */}
      <section className={`${styles.section} container`}>
        <div className="skeleton" style={{ height: '2rem', width: '15rem', marginBottom: '2rem', borderRadius: '8px' }} />
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={4} />
          ))}
        </div>
      </section>

      {/* Tutor cards skeleton */}
      <section className={`${styles.section} container`}>
        <div className="skeleton" style={{ height: '2rem', width: '12rem', marginBottom: '2rem', borderRadius: '8px' }} />
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} lines={2} />
          ))}
        </div>
      </section>
    </div>
  );
}
