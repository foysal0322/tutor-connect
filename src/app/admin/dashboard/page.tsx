import { prisma } from '@/lib/prisma';
import DashboardContent from './DashboardContent';

export const revalidate = 0;

export default async function AdminDashboard() {
  const [
    totalStudents,
    totalTutors,
    blockedUsers,
    totalRequests,
    pendingRequests,
    matchedRequests,
    paymentPendingRequests,
    completedRequests,
    totalDepartments,
    totalCourses,
    totalExpertises,
    pendingWithdrawalsCount,
    pendingWithdrawalsAmountResult,
    pendingSupportTickets,
    pendingRefunds,
    totalBudgetResult,
    topCoursesRaw
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TUTOR' } }),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.tutorRequest.count(),
    prisma.tutorRequest.count({ where: { status: 'PENDING' } }),
    prisma.tutorRequest.count({ where: { status: { in: ['MATCHED', 'ACCEPTED'] } } }),
    prisma.tutorRequest.count({ where: { status: 'PAYMENT_PENDING' } }),
    prisma.tutorRequest.count({ where: { status: 'COMPLETED' } }),
    prisma.department.count(),
    prisma.course.count(),
    prisma.tutorExpertise.count({ where: { isActive: true } }),
    prisma.withdrawalRequest.count({ where: { status: 'PENDING' } }),
    prisma.withdrawalRequest.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true } }),
    prisma.supportTicket.count({ where: { status: 'PENDING' } }),
    prisma.refundRequest.count({ where: { status: 'PENDING' } }),
    prisma.tutorRequest.aggregate({ _sum: { budget: true } }),
    prisma.course.findMany({
      take: 20,
      include: {
        _count: {
          select: { requests: true, expertises: true }
        }
      }
    })
  ]);

  const stats = {
    totalStudents,
    totalTutors,
    blockedUsers,
    totalRequests,
    pendingRequests,
    matchedRequests,
    paymentPendingRequests,
    completedRequests,
    totalDepartments,
    totalCourses,
    totalExpertises,
    pendingWithdrawalsCount,
    pendingWithdrawalsAmount: pendingWithdrawalsAmountResult._sum.amount || 0,
    pendingSupportTickets,
    pendingRefunds,
    totalBudget: totalBudgetResult._sum.budget || 0,
  };

  const topCourses = topCoursesRaw
    .map(c => ({
      name: c.name,
      requests: c._count.requests,
      expertises: c._count.expertises
    }))
    .sort((a, b) => (b.requests + b.expertises) - (a.requests + a.expertises))
    .slice(0, 6);

  const dashboardData = {
    stats,
    topCourses
  };

  return <DashboardContent data={dashboardData} />;
}
