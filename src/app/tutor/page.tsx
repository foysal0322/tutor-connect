import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import styles from '../dashboard.module.css';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function TutorDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'TUTOR') {
    redirect('/auth/tutor-signin');
  }

  const tutorId = (session.user as any).id;

  // Only select the columns actually rendered in the table
  const assignedRequests = await prisma.tutorRequest.findMany({
    where: { assignedTutorId: tutorId },
    select: {
      id: true,
      topic: true,
      preferredMode: true,
      preferredDateTime: true,
      budget: true,
      status: true,
      createdAt: true,
      course: { select: { name: true } },
      student: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '2rem' }}>Tutor Dashboard</h1>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>My Assigned Students</h2>
      <div className={styles.card}>
        {assignedRequests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>You don&apos;t have any assigned students yet. Add your expertise to get matched!</p>
        ) : (
          <table className={styles.table}>
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
              {assignedRequests.map(req => (
                <tr key={req.id}>
                  <td>{req.student.name}</td>
                  <td>{req.course.name}</td>
                  <td>{req.topic}</td>
                  <td>{req.preferredMode}</td>
                  <td>{req.preferredDateTime ? new Date(req.preferredDateTime).toLocaleString() : 'N/A'}</td>
                  <td>{req.budget} BDT</td>
                  <td>
                    <span style={{ 
                      padding: '0.25rem 0.5rem', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      backgroundColor: req.status === 'COMPLETED' ? '#d1fae5' : '#dbeafe',
                      color: req.status === 'COMPLETED' ? '#047857' : '#1d4ed8'
                    }}>
                      {req.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
