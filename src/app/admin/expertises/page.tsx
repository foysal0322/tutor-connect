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
    <div className="max-w-full">
      <h1 className="mb-6">Offered Courses</h1>
      <ExpertiseManager expertises={expertises} />
    </div>
  );
}
