import { redirect } from 'next/navigation';
import VerifyForm from './VerifyForm';

export const metadata = {
  title: 'Verify Your Email | nsuOne',
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string }>;
}) {
  const { userId } = await searchParams;
  if (!userId) redirect('/auth/signin');
  return <VerifyForm userId={userId} />;
}
