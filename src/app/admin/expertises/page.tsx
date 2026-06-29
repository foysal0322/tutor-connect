import { prisma } from '@/lib/prisma';
import ExpertiseManager from './ExpertiseManager';

export default async function AdminExpertisesPage() {
  const expertises = await prisma.tutorExpertise.findMany({
    where: {
      isActive: true
    },
    include: {
      tutor: {
        select: {
          name: true,
          nsuId: true
        }
      },
      course: {
        select: {
          name: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Offered Courses</h1>
      <ExpertiseManager expertises={expertises} />
    </div>
  );
}
