import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import ProfileForm from '@/components/ProfileForm';
import { requireRole } from '@/lib/server/auth-gate';

/**
 * Unified member profile. The same `ProfileForm` is used for every member —
 * there are no role-specific fields. Replaces the old /student/profile and
 * /tutor/profile routes (which now redirect here).
 */
export default async function ProfilePage() {
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/profile',
  });

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    // Session references a user that no longer exists — force a clean sign-out.
    redirect('/auth/force-signout?reason=session-expired');
  }

  const departments = await getDepartments();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6">My Profile</h1>
      <ProfileForm user={user} departments={departments} />
    </div>
  );
}
