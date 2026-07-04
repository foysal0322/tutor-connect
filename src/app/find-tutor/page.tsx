import { prisma } from '@/lib/prisma';
import FindTutorClient from './FindTutorClient';

export const revalidate = 0; // Fetch dynamic data on every request

export default async function FindTutorPage() {
  const expertises = await prisma.tutorExpertise.findMany({
    where: { isActive: true },
    include: {
      tutor: {
        select: {
          id: true,
          name: true,
          cgpa: true,
          gender: true,
          department: {
            select: { name: true }
          }
        }
      },
      course: {
        select: {
          id: true,
          name: true,
          departmentId: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <FindTutorClient
      initialExpertises={expertises as any}
      departments={departments}
    />
  );
}
