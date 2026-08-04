import { redirect } from 'next/navigation';
import VerifyForm from './VerifyForm';

export const metadata = {
  title: 'Verify Your Email | nsuOne',
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; userId?: string }>;
}) {
  const { token, userId } = await searchParams;
  // token  → PendingRegistration flow (registration verify).
  // userId → existing-User flow (unverified user signing in).
  if (!token && !userId) redirect('/auth/signin');
  return <VerifyForm token={token} userId={userId} />;
}
