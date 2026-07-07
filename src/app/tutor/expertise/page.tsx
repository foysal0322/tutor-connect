import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getCourses } from '@/lib/cache';
import ExpertiseDashboard from './ExpertiseDashboard';

export default async function ExpertisePage() {
  const session = await getServerSession(authOptions);
  const tutorId = (session?.user as any)?.id;

  const expertises = await prisma.tutorExpertise.findMany({
    where: { tutorId },
    include: { course: true },
    orderBy: { createdAt: 'desc' }
  });

  const allCourses = await getCourses();

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Course Expertise</h1>
      <ExpertiseDashboard expertises={expertises} allCourses={allCourses} />
    </div>
  );
}
