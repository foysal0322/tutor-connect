import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCourses } from '@/lib/cache';
import ExpertiseDashboard from './ExpertiseDashboard';

/**
 * /tutor/expertise
 *
 * The single place where a member manages the courses they can teach.
 * Read-only server fetch happens here; all interactivity lives in the
 * <ExpertiseDashboard> client island below.
 *
 * Data contract with the client: each expertise is serialized with its
 * course and the course's department so the client can render category
 * pills and compute summary stats without a second round-trip.
 */
export default async function ExpertisePage() {
  const session = await getServerSession(authOptions);
  const tutorId = (session?.user as any)?.id;

  const expertises = await prisma.tutorExpertise.findMany({
    where: { tutorId },
    include: { course: { include: { department: true } } },
    orderBy: { createdAt: 'desc' },
  });

  const allCourses = await getCourses();

  return (
    <div className="max-w-full animate-fade-in">
      <ExpertiseDashboard expertises={expertises} allCourses={allCourses} />
    </div>
  );
}
