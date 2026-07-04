import { prisma } from '@/lib/prisma';
import StudentRegisterForm from './StudentRegisterForm';
import { Suspense } from 'react';

export default async function StudentRegisterPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentRegisterForm departments={departments} />
    </Suspense>
  );
}
