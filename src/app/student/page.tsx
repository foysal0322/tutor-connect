import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import styles from '../dashboard.module.css';
import Link from 'next/link';
import CancelRequestButton from './CancelRequestButton';

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);
  const studentId = (session?.user as any)?.id;

  const requests = await prisma.tutorRequest.findMany({
    where: { studentId },
    include: { course: true, assignedTutor: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '2rem' }}>My Tutor Requests</h1>
        <Link href="/student/request-tutor" className="btn-primary">New Request</Link>
      </div>

      <div className={styles.card}>
        {requests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You haven't requested any tutors yet.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Course</th>
                <th>Topic</th>
                <th>Mode</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Assigned Tutor</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id}>
                  <td>{req.course.name}</td>
                  <td>{req.topic}</td>
                  <td>{req.preferredMode}</td>
                  <td>{req.budget} BDT</td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      backgroundColor: req.status === 'PENDING' ? '#fef3c7' : (req.status === 'CANCELLED' ? '#f1f5f9' : '#d1fae5'),
                      color: req.status === 'PENDING' ? '#d97706' : (req.status === 'CANCELLED' ? '#64748b' : '#047857')
                    }}>
                      {req.status}
                    </span>
                    {req.status === 'PENDING' && (
                      <CancelRequestButton requestId={req.id} />
                    )}
                  </td>
                  <td>{req.assignedTutor ? req.assignedTutor.name : 'Waiting for Admin'}</td>
                  <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
