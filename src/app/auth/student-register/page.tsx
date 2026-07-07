import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import StudentRegisterForm from './StudentRegisterForm';
import { Suspense } from 'react';

export default async function StudentRegisterPage() {
  const departments = await getDepartments();

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <StudentRegisterForm departments={departments} />
    </Suspense>
  );
}
