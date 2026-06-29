import { prisma } from '@/lib/prisma';
import StudentRegisterForm from './StudentRegisterForm';

export default async function StudentRegisterPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  return <StudentRegisterForm departments={departments} />;
}
