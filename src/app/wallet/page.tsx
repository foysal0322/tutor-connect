import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getWalletData } from './actions';
import WalletClient from './WalletClient';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/auth/student-signin?callbackUrl=/wallet');
  }

  const data = await getWalletData();
  if ('error' in data || !data) {
    redirect('/auth/force-signout');
  }

  const role = (session.user as any).role || 'STUDENT';

  return (
    <DashboardLayout 
      role={role as any} 
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      <div className="max-w-4xl">
        <h1 className="mb-6 font-extrabold text-2xl md:text-3xl text-main">💰 My Campus Wallet</h1>
        <WalletClient initialBalance={data.balance || 0} initialTransactions={data.transactions || []} />
      </div>
    </DashboardLayout>
  );
}
