import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWalletData } from './actions';
import WalletClient from './WalletClient';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/auth/signin?callbackUrl=/wallet');
  }

  const data = await getWalletData();
  if ('error' in data || !data) {
    redirect('/auth/force-signout?reason=session-expired');
  }

  const role = (session.user as any).role || 'STUDENT';

  return (
    <DashboardLayout 
      role={role as any} 
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      <div className="w-full max-w-5xl mx-auto py-2">
        <WalletClient initialBalance={data.balance || 0} initialTransactions={data.transactions || []} userName={session.user?.name || 'Student'} />
      </div>
    </DashboardLayout>
  );
}
