import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';

export default async function TutorLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any)?.role === 'ADMIN') {
    redirect('/auth/tutor-signin');
  }

  return (
    <DashboardLayout 
      role="TUTOR" 
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      {children}
    </DashboardLayout>
  );
}
