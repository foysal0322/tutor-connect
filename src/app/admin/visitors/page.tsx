import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import DashboardClient from './DashboardClient';

export const metadata = {
  title: 'Visitor Analytics | Admin | nsuOne',
};

// Add dynamic force to ensure we get fresh data
export const dynamic = 'force-dynamic';

export default async function VisitorLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    redirect('/auth/admin-signin');
  }

  // Fetch all data for client-side processing
  // Note: For massive scale, this should be paginated, but for standard usage 
  // pulling the last 30-90 days is acceptable for client-side filtering.
  // We'll pull the last 60 days to keep the payload reasonable while allowing for trend analysis.
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

  const logs = await prisma.visitorLog.findMany({
    where: {
      createdAt: { gte: sixtyDaysAgo }
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <DashboardClient initialLogs={logs} />
  );
}
