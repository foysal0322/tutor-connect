import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from '../dashboard.module.css';
import StudentSidebar from './StudentSidebar';

export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'STUDENT') {
    return <>{children}</>;
  }

  return (
    <div className={styles.dashboardContainer}>
      <StudentSidebar userName={session.user?.name} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
