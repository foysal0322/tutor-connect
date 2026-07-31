import { redirect } from 'next/navigation';
import VerifyForm from './VerifyForm';

export const metadata = {
  title: 'Verify Your Email | nsuOne',
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect('/auth/signin');
  return <VerifyForm token={token} />;
}
