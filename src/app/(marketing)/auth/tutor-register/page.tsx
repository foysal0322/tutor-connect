import { redirect } from 'next/navigation';

// Unified registration now lives at /auth/register. Preserves incoming callbackUrl.
export default async function TutorRegisterRedirect({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;
  redirect(`/auth/register${callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`);
}
