import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import ProfileForm from '@/components/ProfileForm';

import { redirect } from 'next/navigation';

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'STUDENT') {
    redirect('/auth/student-signin?callbackUrl=/student/profile');
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id }
  });
  
  const departments = await getDepartments();

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>My Profile</h1>
      <ProfileForm user={user} departments={departments} />
    </div>
  );
}
