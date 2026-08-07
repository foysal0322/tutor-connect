import styles from './shop.module.css';

/**
 * Browse loading skeleton — matches the shape of the browse page (header,
 * KPI strip, filter bar, grid) so Suspense swaps feel native.
 */
export default function Loading() {
  return (
    <div className={styles.browseWrap}>
      <div
        style={{
          paddingTop: 'var(--space-6)',
          paddingBottom: 'var(--space-4)',
        }}
      >
        <div className='skeleton' style={{ height: 28, width: 200, marginBottom: 8 }} />
        <div className='skeleton' style={{ height: 16, width: 320 }} />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns:
            'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className='skeleton'
            style={{ height: 90, borderRadius: 'var(--radius-md)' }}
          />
        ))}
      </div>

      <div
        className='skeleton'
        style={{ height: 52, marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}
      />

      <div
        style={{
          display: 'grid',
          gap: 'var(--space-4)',
          gridTemplateColumns:
            'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
        }}
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className='skeleton'
            style={{ height: 320, borderRadius: 'var(--radius-lg)' }}
          />
        ))}
      </div>
    </div>
  );
}
