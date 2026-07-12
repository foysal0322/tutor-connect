import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import styles from '../../dashboard.module.css';
import VisitorLogsClient from './VisitorLogsClient';

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
    <div className={styles.dashboardContainer}>
      <header className={styles.header}>
        <div>
          <h2>Visitor Logs</h2>
          <p>View and filter website visitor traffic</p>
        </div>
      </header>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Total Visits</h3>
          <p className={styles.statNumber}>{totalVisits}</p>
        </div>
        <div className={styles.statCard}>
          <h3>Unique Visitors</h3>
          <p className={styles.statNumber}>{uniqueVisitors}</p>
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
