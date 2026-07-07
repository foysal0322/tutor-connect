import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import FindTutorClient from './FindTutorClient';

// Cache for 1 minute — tutor availability changes occasionally
export const revalidate = 60;

export default async function FindTutorPage() {
  const [expertises, departments] = await Promise.all([
    prisma.tutorExpertise.findMany({
      where: { isActive: true },
      select: {
        id: true,
        tutorId: true,
        courseId: true,
        semesterCompleted: true,
        facultyName: true,
        courseGrade: true,
        availability: true,
        sessionFee: true,
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
      orderBy: { createdAt: 'desc' },
      // Safety limit — prevent unbounded result sets
      take: 200,
    }),
    // Departments change very rarely — cache for 24 hours
    getDepartments(),
  ]);

  return (
    <FindTutorClient
      initialExpertises={expertises as any}
      departments={departments}
    />
  );
}
