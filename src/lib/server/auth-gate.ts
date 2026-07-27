import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import type { Session } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * Server-side auth gate for role-scoped layouts.
 *
 * Extracted from the three duplicated admin/student/tutor layouts.
 * See FRONTEND_AUDIT.md E4.
 *
 * Returns the session if the user is signed in AND has one of the allowed
 * roles. Otherwise redirects to the role's sign-in page.
 *
 * Special case: the student and tutor layouts accept BOTH roles because
 * nsuOne is a unified campus marketplace — a single user can flip between
 * student and tutor dashboards. Only the admin layout is exclusive.
 */

const SIGN_IN_URL: Record<'ADMIN' | 'STUDENT' | 'TUTOR', string> = {
  ADMIN: '/auth/admin-signin',
  STUDENT: '/auth/student-signin',
  TUTOR: '/auth/tutor-signin',
};

export type Role = 'ADMIN' | 'STUDENT' | 'TUTOR';

export interface RequireRoleOptions {
  /**
   * Redirect destination when the user is signed in but lacks the required
   * role. Defaults to the role's own sign-in page. Use this to bounce signed-in
   * students to their dashboard instead of the sign-in screen.
   */
  redirectTo?: string;
}

export async function requireRole(
  allowed: Role[],
  fallbackSignIn: Role,
  opts?: RequireRoleOptions,
): Promise<NonNullable<Session>> {
  const session = await getServerSession(authOptions);
  // The session.user type is augmented in src/types/next-auth.d.ts to include `role`.
  const role = (session?.user as { role?: Role })?.role;

  if (!session || !role || !allowed.includes(role)) {
    redirect(opts?.redirectTo ?? SIGN_IN_URL[fallbackSignIn]);
  }

  return session as NonNullable<Session>;
}
