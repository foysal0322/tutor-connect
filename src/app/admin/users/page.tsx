import { prisma } from '@/lib/prisma';
import UserManager from './UserManager';

export default async function AdminUsersPage() {
  // Select only columns rendered in the table — never fetch password hashes
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['STUDENT', 'TUTOR'] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      nsuId: true,
      role: true,
      contact: true,
      isBlocked: true,
      createdAt: true,
      department: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Serialize dates for the client component (Date objects cannot cross the
  // server→client boundary as JSON).
  const serialized = users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));

  return (
    <div className='max-w-full'>
      <UserManager users={serialized} />
    </div>
  );
}
