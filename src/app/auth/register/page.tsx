import { getDepartments } from '@/lib/cache';
import RegisterForm from './RegisterForm';
import { Suspense } from 'react';

export default async function RegisterPage() {
  const departments = await getDepartments();

  return (
    <Suspense fallback={null}>
      <RegisterForm departments={departments} />
    </Suspense>
  );
}
