import { prisma } from '@/lib/prisma';

/**
 * Sidebar badge counts for a signed-in member (student/tutor).
 *
 * Shared by every member layout (dashboard, student, tutor, profile) so the
 * sidebar Payments badge is identical no matter which member page you're on.
 *
 * `paymentsDue` = tutor requests awaiting payment (status MATCHED). The badge
 * clears automatically once the student pays (status leaves MATCHED).
 */
export async function getMemberSidebarCounts(userId: string) {
  const paymentsDue = await prisma.tutorRequest.count({
    where: { studentId: userId, status: 'MATCHED' },
  });
  return { paymentsDue };
}
