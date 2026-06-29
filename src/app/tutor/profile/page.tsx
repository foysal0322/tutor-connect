import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ProfileForm from '@/components/ProfileForm';

export default async function TutorProfilePage() {
  const session = await getServerSession(authOptions);
  const user = await prisma.user.findUnique({
    where: { id: (session?.user as any).id }
  });
  
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>My Profile</h1>
      <ProfileForm user={user} departments={departments} />
    </div>
  );
}
