import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import FormLoading from '@/components/ui/FormLoading';
import SignInForm from './SignInForm';

export default async function SignInPage() {
  // Authenticated users have no business on the sign-in page — bounce them to
  // their dashboard. Admins go to the admin portal; everyone else to the
  // unified member dashboard. Without this role check, an admin landing here
  // gets bounced to /dashboard, which rejects ADMIN via requireRole and
  // redirects back to /auth/signin — an infinite loop.
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect((session.user as { role?: string }).role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
  }

  return (
    <Suspense
      fallback={
        <FormLoading
          variant='inline'
          title='One moment…'
          message='Preparing the sign-in form for you.'
        />
      }
    >
      <SignInForm />
    </Suspense>
  );
}
