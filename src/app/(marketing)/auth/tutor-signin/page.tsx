import { redirect } from 'next/navigation';

// Unified sign-in now lives at /auth/signin. Preserves incoming callbackUrl.
export default async function TutorSignInRedirect({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  redirect(`/auth/signin${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`);
}
