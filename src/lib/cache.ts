import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

/**
 * Cached departments list — revalidates every 24 hours.
 * Departments almost never change, so we cache aggressively.
 */
export const getDepartments = unstable_cache(
  async () => {
    return prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' }
    });
  },
  ['departments'],
  { revalidate: 86400, tags: ['departments'] }
);

/**
 * Cached courses list — revalidates every 24 hours.
 * Courses are added/removed infrequently by admins.
 */
export const getCourses = unstable_cache(
  async () => {
    return prisma.course.findMany({
      select: {
        id: true,
        name: true,
        departmentId: true,
        department: {
          select: { name: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  },
  ['courses'],
  { revalidate: 86400, tags: ['courses'] }
);

/**
 * Cached homepage stats — revalidates every 5 minutes.
 * These are displayed publicly and don't need to be real-time.
 */
export const getHomepageStats = unstable_cache(
  async () => {
    const [totalTutors, totalStudents, totalRequests] = await Promise.all([
      prisma.user.count({ where: { role: 'TUTOR' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.tutorRequest.count({ where: { status: 'COMPLETED' } }),
    ]);
    return { totalTutors, totalStudents, totalRequests };
  },
  ['homepage-stats'],
  { revalidate: 300, tags: ['homepage-stats'] }
);
