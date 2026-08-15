import { getDepartments } from '@/lib/cache';
import RegisterForm from './RegisterForm';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import FormLoading from '@/components/ui/FormLoading';

export default async function RegisterPage() {
  // Authenticated users have no business on the registration page — bounce
  // them to their dashboard. (Policy #38)
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect('/dashboard');
  }

  const departments = await getDepartments();

  return (
    <Suspense
      fallback={
        <FormLoading
          variant='inline'
          title='One moment…'
          message='Preparing the form for you.'
        />
      }
    >
      <RegisterForm departments={departments} />
    </Suspense>
  );
}
