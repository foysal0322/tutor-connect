import { prisma } from '@/lib/prisma';
import ExpertiseManager from './ExpertiseManager';

export const revalidate = 0;

export default async function AdminExpertisesPage() {
  // Load ALL expertises (not just isActive=true) so the admin can edit or
  // reactivate hidden ones. Active rows are surfaced first.
  const [expertises, courses] = await Promise.all([
    prisma.tutorExpertise.findMany({
      include: {
        tutor: { select: { name: true, nsuId: true } },
        course: { select: { name: true } },
      },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.course.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="max-w-full">
      <h1 className="mb-6">Course Expertises</h1>
      <ExpertiseManager expertises={expertises} courses={courses} />
    </div>
  );
}
