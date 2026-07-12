import styles from '../../dashboard.module.css';

export default function Loading() {
  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <div>
          <div style={{ height: '30px', width: '200px', background: 'var(--bg-card)', borderRadius: '5px', marginBottom: '0.5rem', animation: 'pulse 1.5s infinite' }}></div>
          <div style={{ height: '20px', width: '300px', background: 'var(--bg-card)', borderRadius: '5px', animation: 'pulse 1.5s infinite' }}></div>
        </div>
      </header>
      
      <div className={styles.statsGrid}>
        {[1, 2].map(i => (
          <div key={i} className={styles.statCard} style={{ animation: 'pulse 1.5s infinite', border: 'none', background: 'var(--bg-card)' }}>
            <div style={{ height: '20px', width: '100px', background: 'var(--border)', borderRadius: '5px', marginBottom: '1rem' }}></div>
            <div style={{ height: '40px', width: '60px', background: 'var(--border)', borderRadius: '5px' }}></div>
          </div>
        ))}
      </div>

      <div className={styles.recentSection}>
        <div style={{ height: '30px', width: '150px', background: 'var(--bg-card)', borderRadius: '5px', marginBottom: '1rem', animation: 'pulse 1.5s infinite' }}></div>
        <div style={{ height: '300px', background: 'var(--bg-card)', borderRadius: '10px', animation: 'pulse 1.5s infinite' }}></div>
      </div>
    </div>
  );
}
