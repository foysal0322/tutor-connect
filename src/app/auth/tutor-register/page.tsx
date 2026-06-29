import { prisma } from '@/lib/prisma';
import TutorRegisterForm from './TutorRegisterForm';

export default async function TutorRegisterPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  return <TutorRegisterForm departments={departments} />;
}
