import Link from 'next/link';
import styles from './shop.module.css';

export default function ShopComingSoon() {
  return (
    <div className={styles.container}>
      <div className={styles.blobs}>
        <div className={styles.blob1}></div>
        <div className={styles.blob2}></div>
      </div>
      
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <svg xmlns="http://www.w3.org/2000/svg" className={styles.icon} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h1 className={styles.title}>One Shop is Coming Soon</h1>
        <p className={styles.description}>
          We're working hard to bring you the best shopping experience for educational materials. 
          Stay tuned for exclusive books, study guides, and stationeries tailored for you!
        </p>
        <Link href="/" className={styles.backBtn}>
          Back to Home
        </Link>
      </div>
    </div>
  );
}
