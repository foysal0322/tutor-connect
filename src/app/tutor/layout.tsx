import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import styles from '../dashboard.module.css';
import TutorSidebar from './TutorSidebar';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'TUTOR') {
    redirect('/auth/tutor-signin');
  }

  return (
    <div className={styles.dashboardContainer}>
      <TutorSidebar userName={session.user?.name} />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
