import { redirect } from 'next/navigation';

export default async function TutorSignInPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const resolvedParams = await searchParams;
  const callbackUrl = resolvedParams?.callbackUrl || '/tutor';
  redirect(`/auth/student-signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
}
