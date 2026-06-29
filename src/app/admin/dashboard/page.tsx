import { prisma } from '@/lib/prisma';
import styles from '../../dashboard.module.css';

export default async function AdminDashboard() {
  const totalStudents = await prisma.user.count({ where: { role: 'STUDENT' } });
  const totalTutors = await prisma.user.count({ where: { role: 'TUTOR' } });
  const totalRequests = await prisma.tutorRequest.count();
  const pendingRequests = await prisma.tutorRequest.count({ where: { status: 'PENDING' } });
  
  const stats = [
    { label: 'Total Students', value: totalStudents },
    { label: 'Total Tutors', value: totalTutors },
    { label: 'Total Requests', value: totalRequests },
    { label: 'Pending Requests', value: pendingRequests },
  ];

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Dashboard Overview</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        {stats.map((s, i) => (
          <div key={i} className={styles.card} style={{ textAlign: 'center', padding: '2rem' }}>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '0.5rem' }}>{s.value}</div>
            <div style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
