import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import styles from '../../dashboard.module.css';
import VisitorLogsClient from './VisitorLogsClient';
import { Users, UserPlus, Activity } from 'lucide-react';

export const metadata = {
  title: 'Visitor Logs | Admin | nsuOne',
};

// Add dynamic force to ensure we get fresh data
export const dynamic = 'force-dynamic';

export default async function VisitorLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/admin-signin');
  }

  const resolvedSearchParams = await searchParams;
  const startDateStr = typeof resolvedSearchParams.startDate === 'string' ? resolvedSearchParams.startDate : undefined;
  const endDateStr = typeof resolvedSearchParams.endDate === 'string' ? resolvedSearchParams.endDate : undefined;

  let dateFilter = {};
  if (startDateStr || endDateStr) {
    dateFilter = {
      createdAt: {
        ...(startDateStr ? { gte: new Date(startDateStr) } : {}),
        ...(endDateStr ? { lte: new Date(new Date(endDateStr).setHours(23, 59, 59, 999)) } : {}),
      },
    };
  }

  // Fetch data
  const logs = await prisma.visitorLog.findMany({
    where: dateFilter,
    orderBy: { createdAt: 'desc' },
  });

  // Calculate stats
  const totalVisits = logs.length;
  const uniqueVisitors = new Set(logs.map(log => log.ip)).size;

  return (
    <div className={styles.dashboardContainer} style={{ padding: '1rem', background: 'var(--bg-color)' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '12px', color: 'var(--primary)' }}>
          <Activity size={28} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>Visitor Logs</h2>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem' }}>Monitor and analyze website traffic and visitor activity</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Total Visits Card */}
        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: '50%', color: 'var(--primary)' }}>
            <Users size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Visits</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{totalVisits}</p>
          </div>
        </div>

        {/* Unique Visitors Card */}
        <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%', color: '#10b981' }}>
            <UserPlus size={24} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unique Visitors</h3>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)' }}>{uniqueVisitors}</p>
          </div>
        </div>

      </div>

      <VisitorLogsClient
        initialStartDate={startDateStr || ''}
        initialEndDate={endDateStr || ''}
        logs={logs}
      />
    </div>
  );
}
