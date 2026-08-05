import styles from './find-tutor.module.css';

/**
 * Loading skeleton for /find-tutor.
 *
 * Built from the same layout classes as the real page so the transition
 * from skeleton to content causes minimal layout shift. Shimmer blocks use
 * the global `.skeleton` utility from globals.css.
 */
export default function FindTutorLoading() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div
            className="skeleton"
            style={{ width: '180px', height: '26px', margin: '0 auto 20px', borderRadius: '9999px' }}
          />
          <div
            className="skeleton"
            style={{ width: 'min(100%, 460px)', height: '42px', margin: '0 auto 16px' }}
          />
          <div
            className="skeleton"
            style={{ width: 'min(100%, 420px)', height: '18px', margin: '0 auto 8px' }}
          />
          <div
            className="skeleton"
            style={{ width: 'min(100%, 300px)', height: '18px', margin: '0 auto 32px' }}
          />
          {/* Search */}
          <div className={styles.searchWrap}>
            <div
              className="skeleton"
              style={{ width: '100%', height: '60px', borderRadius: '9999px' }}
            />
          </div>
          <div
            className="skeleton"
            style={{ width: '240px', height: '14px', margin: '16px auto 0' }}
          />
        </div>
      </section>

      {/* Content */}
      <div className={styles.content}>
        {/* Toolbar */}
        <div className={styles.toolbar}>
          <div className={styles.toolbarMain}>
            <div className="skeleton" style={{ width: '220px', height: '18px' }} />
          </div>
          <div className={styles.filters}>
            <div className={styles.filterField}>
              <div className="skeleton" style={{ width: '90px', height: '12px', marginBottom: '6px' }} />
              <div className="skeleton" style={{ width: '168px', height: '44px', borderRadius: '10px' }} />
            </div>
            <div className={styles.filterField}>
              <div className="skeleton" style={{ width: '60px', height: '12px', marginBottom: '6px' }} />
              <div className="skeleton" style={{ width: '168px', height: '44px', borderRadius: '10px' }} />
            </div>
          </div>
        </div>

        {/* Grid */}
        <div className={styles.results}>
          <div className={styles.grid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Skeleton matching the real tutor expertise card layout. */
function CardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div
          className="skeleton"
          style={{ width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0 }}
        />
        <div className={styles.identity}>
          <div className="skeleton" style={{ height: '16px', width: '65%', marginBottom: '8px' }} />
          <div className="skeleton" style={{ height: '13px', width: '45%' }} />
        </div>
      </div>

      <div className={styles.courseBlock}>
        <div className="skeleton" style={{ width: '18px', height: '18px', flexShrink: 0, borderRadius: '4px' }} />
        <div className={styles.courseMeta}>
          <div className="skeleton" style={{ height: '9px', width: '44px', marginBottom: '6px' }} />
          <div className="skeleton" style={{ height: '15px', width: '75%' }} />
        </div>
      </div>

      <dl className={styles.stats}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.statCell}>
            <div className="skeleton" style={{ height: '9px', width: '60%', marginBottom: '8px' }} />
            <div className="skeleton" style={{ height: '14px', width: '80%' }} />
          </div>
        ))}
      </dl>

      <div className={styles.trustRow}>
        <div className="skeleton" style={{ height: '15px', width: '48px' }} />
        <div className="skeleton" style={{ height: '15px', width: '80px' }} />
        <div className="skeleton" style={{ height: '15px', width: '80px' }} />
      </div>

      <div className={styles.availFee}>
        <div className="skeleton" style={{ height: '15px', width: '130px' }} />
        <div className="skeleton" style={{ height: '18px', width: '80px' }} />
      </div>

      <div className={styles.cardFooter}>
        <div className="skeleton" style={{ height: '44px', width: '100%', borderRadius: '10px' }} />
        <div className="skeleton" style={{ height: '38px', width: '100%', borderRadius: '10px' }} />
      </div>
    </div>
  );
}
