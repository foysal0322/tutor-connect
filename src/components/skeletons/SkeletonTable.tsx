/**
 * Skeleton table rows with shimmer animation.
 * Matches the style of the dashboard tables across the app.
 */
export default function SkeletonTable({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th
                key={i}
                style={{
                  padding: '0.75rem 1rem',
                  borderBottom: '2px solid var(--border-color)',
                  textAlign: 'left',
                }}
              >
                <div className="skeleton" style={{ height: '0.9rem', width: '70%' }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} style={{ padding: '0.875rem 1rem' }}>
                  <div
                    className="skeleton"
                    style={{
                      height: '0.9rem',
                      width: colIdx === 0 ? '80%' : colIdx === columns - 1 ? '50%' : '65%',
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
