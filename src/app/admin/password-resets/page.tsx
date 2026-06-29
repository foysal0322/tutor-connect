import { prisma } from '@/lib/prisma';
import PasswordResetManager from './PasswordResetManager';
import styles from '../../dashboard.module.css';

export const dynamic = 'force-dynamic';

export default async function PasswordResetsPage() {
  const requests = await prisma.passwordResetRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: true }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className={styles.pageTitle}>Password Resets</h1>
      </div>
      
      <div className={styles.card}>
        <PasswordResetManager initialRequests={requests} />
      </div>
    </div>
  );
}
