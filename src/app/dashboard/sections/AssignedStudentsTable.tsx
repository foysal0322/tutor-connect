import styles from '../dashboard.module.css';

export interface AssignedStudent {
  id: string;
  studentName: string;
  courseName: string;
  topic: string;
  preferredMode: string;
  preferredDateTime: string | null;
  budget: number;
  status: string;
}

const STATUS_CLASS: Record<string, string> = {
  COMPLETED: 'badge-success',
  ACCEPTED: 'badge-info',
  MATCHED: 'badge-warning',
  PAYMENT_PENDING: 'badge-warning',
  CANCELLED: 'badge-danger',
  PENDING: 'badge-warning',
};

function statusBadgeClass(status: string) {
  return STATUS_CLASS[status] ?? 'badge-warning';
}

export default function AssignedStudentsTable({
  rows,
}: {
  rows: AssignedStudent[];
}) {
  if (rows.length === 0) {
    return (
      <div className={styles.emptyBlock}>
        You don&apos;t have any assigned students yet. New requests matched to you
        will appear here.
      </div>
    );
  }

  return (
    <div className={styles.tableWrap}>
      <table className={`${styles.dataGrid} hidden md:table`}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Course</th>
            <th>Topic</th>
            <th>Mode</th>
            <th>Time</th>
            <th>Budget</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td><strong>{r.studentName}</strong></td>
              <td>{r.courseName}</td>
              <td>{r.topic}</td>
              <td>{r.preferredMode}</td>
              <td>
                {r.preferredDateTime
                  ? new Date(r.preferredDateTime).toLocaleString()
                  : 'N/A'}
              </td>
              <td>{r.budget.toLocaleString()} BDT</td>
              <td>
                <span className={`badge ${statusBadgeClass(r.status)}`}>
                  {r.status.replace('_', ' ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={`${styles.mobileCards} md:hidden`}>
        {rows.map((r) => (
          <div key={r.id} className={styles.mobileCard}>
            <div className={styles.mobileCardHead}>
              <strong>{r.courseName}</strong>
              <span className={`badge ${statusBadgeClass(r.status)}`}>
                {r.status.replace('_', ' ')}
              </span>
            </div>
            <div className={styles.mobileCardRow}>
              <span className="label">Student</span>
              <strong>{r.studentName}</strong>
            </div>
            <div className={styles.mobileCardRow}>
              <span className="label">Topic</span>
              <span>{r.topic}</span>
            </div>
            <div className={styles.mobileCardRow}>
              <span className="label">Mode</span>
              <span>{r.preferredMode}</span>
            </div>
            <div className={styles.mobileCardRow}>
              <span className="label">Budget</span>
              <span>{r.budget.toLocaleString()} BDT</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
