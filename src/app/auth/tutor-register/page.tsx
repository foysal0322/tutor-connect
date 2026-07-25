import { redirect } from 'next/navigation';

export default async function TutorRegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const resolvedParams = await searchParams;
  const callbackUrl = resolvedParams?.callbackUrl || '';
  redirect(`/auth/student-register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`);
}
