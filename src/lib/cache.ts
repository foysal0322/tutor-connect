import { unstable_cache } from 'next/cache';
import { prisma } from './prisma';

// Default platform fee configuration. Used as fallback if no
// PlatformSetting row exists yet (e.g. fresh DB before admin visits
// /admin/settings). Numbers mirror the original hardcoded values.
export const DEFAULT_SETTINGS = {
  withdrawalFeePercent: 5,
  paymentFeePercent: 10,
  promoDiscountPercent: 50,
  consultancyFreeQuota: 2,
  consultancyPaidSessionPrice: 100,
};

/**
 * Cached singleton platform settings. Revalidates every 60s OR when
 * the 'platform-settings' tag is invalidated (admin updates).
 *
 * Lazily seeds the row on first call so a fresh DB without a settings
 * row still works — the cached function converges on the default values.
 */
export const getPlatformSettings = unstable_cache(
  async () => {
    let row = await prisma.platformSetting.findUnique({
      where: { id: 'default' },
    });
    if (!row) {
      // Best-effort seed. Race-safe: if two requests hit simultaneously,
      // the loser's upsert is a no-op.
      row = await prisma.platformSetting.upsert({
        where: { id: 'default' },
        update: {},
        create: { id: 'default', ...DEFAULT_SETTINGS },
      });
    }
    return {
      withdrawalFeePercent: row.withdrawalFeePercent,
      paymentFeePercent: row.paymentFeePercent,
      promoDiscountPercent: row.promoDiscountPercent,
      consultancyFreeQuota: row.consultancyFreeQuota,
      consultancyPaidSessionPrice: row.consultancyPaidSessionPrice,
    };
  },
  ['platform-settings'],
  { revalidate: 60, tags: ['platform-settings'] }
);

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
