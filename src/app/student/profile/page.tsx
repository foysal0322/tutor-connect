import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import ProfileForm from '@/components/ProfileForm';

import { redirect } from 'next/navigation';

export default async function StudentProfilePage() {
  const session = await getServerSession(authOptions);
  console.log('StudentProfilePage - Session:', JSON.stringify(session, null, 2));

  if (!session || (session.user as any).role !== 'STUDENT') {
    redirect('/auth/student-signin?callbackUrl=/student/profile');
  }

  const userId = (session.user as any).id;
  console.log('StudentProfilePage - Looking up user with ID:', userId);

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  console.log('StudentProfilePage - User found:', user ? user.email : 'null');

  if (!user) {
    console.log('StudentProfilePage - User is null, redirecting to force-signout');
    redirect('/auth/force-signout?reason=session-expired');
  }
  
  const departments = await getDepartments();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6">My Profile</h1>
      <ProfileForm user={user} departments={departments} />
    </div>
  );
}
