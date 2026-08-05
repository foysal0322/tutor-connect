import { prisma } from '@/lib/prisma';

/**
 * Sidebar badge counts + capability flag for a signed-in member.
 *
 * Shared by every member layout (dashboard, student, tutor, profile) so the
 * sidebar Payments badge and the UserMenu capability chip stay in sync no
 * matter which member page you're on.
 *
 * - `paymentsDue` = tutor requests awaiting payment (status MATCHED). The
 *   badge clears automatically once the student pays.
 * - `isTutor` = whether the user has at least one TutorExpertise row.
 *   Per the unified-campus model this is **data-derived** (not role-derived)
 *   and the `User.role` enum is intentionally NOT flipped here.
 */
export async function getMemberSidebarCounts(userId: string) {
  const [paymentsDue, expertiseCount] = await Promise.all([
    prisma.tutorRequest.count({
      where: { studentId: userId, status: 'MATCHED' },
    }),
    prisma.tutorExpertise.count({ where: { tutorId: userId } }),
  ]);
  return { paymentsDue, isTutor: expertiseCount > 0 };
}
