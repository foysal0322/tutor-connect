import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import {
  BookOpen,
  CheckCircle,
  MessageSquare,
  Search,
  PlusCircle,
  History,
} from 'lucide-react';
import StatCard from '@/components/ui/StatCard';
import DashboardContent, { type DashboardData } from './DashboardContent';
import OnboardingGuide from './OnboardingGuide';
import StudentRequestList from '@/app/(marketing)/student/StudentRequestList';

/**
 * Unified member dashboard.
 *
 * nsuOne is a unified campus marketplace: every non-admin user is a "Member"
 * who can both learn (request tutors) and teach (offer expertises). The
 * Teaching tab unlocks once the member has at least one expertise. Teaching
 * capability is derived from data (TutorExpertise rows), NOT from the `role`
 * enum — see src/app/tutor/actions.ts.
 */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session || role === 'ADMIN') {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  const userId = (session.user as { id: string }).id;
  const firstName =
    (session.user as { name?: string | null }).name?.split(' ')[0] ?? 'there';

  // -------- Learning data (always) --------
  const [user, learningRequests, consultancyCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        balance: true,
        gender: true,
        departmentId: true,
        cgpa: true,
      },
    }),
    prisma.tutorRequest.findMany({
      where: { studentId: userId },
      select: {
        id: true,
        topic: true,
        facultyName: true,
        preferredMode: true,
        preferredDateTime: true,
        budget: true,
        status: true,
        courseId: true,
        createdAt: true,
        course: { select: { id: true, name: true } },
        assignedTutor: {
          select: {
            id: true, name: true, email: true, contact: true, cgpa: true, gender: true,
            department: { select: { name: true } },
          },
        },
        payment: {
          select: {
            id: true, mfsType: true, accountNumber: true, amount: true, transactionId: true,
          },
        },
        refundRequests: {
          select: { id: true, status: true, details: true, amount: true, reviewNote: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.consultancyRequest.count({ where: { studentId: userId } }),
  ]);

  const userBalance = user?.balance || 0;
  const activeLearningRequests = learningRequests.filter((r) =>
    ['PENDING', 'MATCHED', 'PAYMENT_PENDING', 'ACCEPTED'].includes(r.status),
  ).length;
  const completedLearningSessions = learningRequests.filter(
    (r) => r.status === 'COMPLETED',
  ).length;

  // -------- Teaching data (always fetched; cheaper than branching) --------
  const [
    activeExpertiseCount,
    inactiveExpertiseCount,
    assignedRequestsRaw,
    reviewsRaw,
    recentAcceptedRaw,
    recentExpertiseRaw,
    recentWithdrawalsRaw,
    ratingAgg,
    earningsAgg,
    terminalCounts,
    activeStudentsCount,
    uniqueStudentsAgg,
  ] = await Promise.all([
    prisma.tutorExpertise.count({ where: { tutorId: userId, isActive: true } }),
    prisma.tutorExpertise.count({ where: { tutorId: userId, isActive: false } }),
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: userId },
      select: {
        id: true, topic: true, preferredMode: true, preferredDateTime: true,
        budget: true, status: true, createdAt: true,
        course: { select: { name: true } },
        student: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: userId, rating: { not: null } },
      select: { id: true, rating: true, review: true, createdAt: true, course: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: userId, status: 'ACCEPTED' },
      select: { id: true, createdAt: true, student: { select: { name: true } }, course: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }),
    prisma.tutorExpertise.findMany({
      where: { tutorId: userId },
      select: { id: true, isActive: true, createdAt: true, course: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 2,
    }),
    prisma.withdrawalRequest.findMany({
      where: { tutorId: userId },
      select: { id: true, status: true, netAmount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 2,
    }),
    prisma.tutorRequest.aggregate({
      where: { assignedTutorId: userId, rating: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.tutorRequest.aggregate({
      where: { assignedTutorId: userId, status: 'COMPLETED' },
      _sum: { budget: true },
    }),
    prisma.tutorRequest.groupBy({
      by: ['status'],
      where: { assignedTutorId: userId },
      _count: { _all: true },
    }),
    prisma.tutorRequest.count({
      where: { assignedTutorId: userId, status: 'ACCEPTED' },
    }),
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: userId },
      select: { studentId: true },
      distinct: ['studentId'],
    }),
  ]);

  const totalExpertiseCount = activeExpertiseCount + inactiveExpertiseCount;
  const isTutor = totalExpertiseCount > 0;

  // A member with no learning activity, no consultancy requests, and no teaching
  // has nothing to act on — show a guided onboarding panel instead of empty tabs.
  const needsOnboarding =
    !isTutor && learningRequests.length === 0 && consultancyCount === 0;

  // -------- Derived teaching metrics --------
  const statusCount: Record<string, number> = {};
  for (const g of terminalCounts) statusCount[g.status] = g._count._all;

  const completedSessions = statusCount.COMPLETED ?? 0;
  const awaitingAction = statusCount.MATCHED ?? 0;
  const totalAssigned = assignedRequestsRaw.length;

  // completion rate = completed / (accepted + completed + cancelled + payment_pending)
  const denom =
    (statusCount.ACCEPTED ?? 0) +
    completedSessions +
    (statusCount.CANCELLED ?? 0) +
    (statusCount.PAYMENT_PENDING ?? 0);
  const completionRate = denom > 0 ? Math.round((completedSessions / denom) * 100) : null;

  const avgRating =
    ratingAgg._avg.rating !== null && ratingAgg._avg.rating !== undefined
      ? Math.round((ratingAgg._avg.rating as number) * 10) / 10
      : null;
  const ratingCount = ratingAgg._count._all;

  const totalEarnings = earningsAgg._sum.budget ?? 0;
  const uniqueStudents = uniqueStudentsAgg.length;

  // -------- Course popularity --------
  // Build counts from assignedRequestsRaw directly (already carries course.name).
  const courseCountMap = new Map<string, { name: string; requests: number }>();
  for (const r of assignedRequestsRaw) {
    const existing = courseCountMap.get(r.course.name);
    if (existing) existing.requests += 1;
    else courseCountMap.set(r.course.name, { name: r.course.name, requests: 1 });
  }
  const coursePopularity = Array.from(courseCountMap.values())
    .sort((a, b) => b.requests - a.requests)
    .slice(0, 5)
    .map((c) => ({
      name: c.name,
      shortName: c.name.length > 16 ? `${c.name.slice(0, 15)}…` : c.name,
      requests: c.requests,
    }));

  // -------- Profile completion --------
  const profileFields = {
    hasGender: Boolean(user?.gender),
    hasDepartment: Boolean(user?.departmentId),
    hasCgpa: user?.cgpa !== null && user?.cgpa !== undefined,
    hasAnyExpertise: totalExpertiseCount > 0,
    hasActiveExpertise: activeExpertiseCount > 0,
  };
  const filledProfileFields = Object.values(profileFields).filter(Boolean).length;
  const profilePercent = Math.round((filledProfileFields / 5) * 100);

  // -------- Activity feed (merge + sort + cap 6) --------
  type FeedEntry = DashboardData['teaching']['activity'][number];
  const activity: FeedEntry[] = [
    ...reviewsRaw.map((r) => ({
      id: r.id,
      kind: 'review' as const,
      title: `Earned a ${r.rating}★ review on ${r.course.name}`,
      meta: r.review ? `"${r.review.slice(0, 80)}${r.review.length > 80 ? '…' : ''}"` : undefined,
      at: r.createdAt,
    })),
    ...recentAcceptedRaw.map((r) => ({
      id: r.id,
      kind: 'student' as const,
      title: `${r.student.name} accepted you for ${r.course.name}`,
      at: r.createdAt,
    })),
    ...recentExpertiseRaw.map((e) => ({
      id: e.id,
      kind: 'expertise' as const,
      title: `${e.isActive ? 'Listed' : 'Paused'} expertise in ${e.course.name}`,
      at: e.createdAt,
    })),
    ...recentWithdrawalsRaw.map((w) => ({
      id: w.id,
      kind: 'withdrawal' as const,
      title: `Withdrawal ${w.status.toLowerCase()} — ৳${w.netAmount.toLocaleString()} net`,
      at: w.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  // -------- Action center items --------
  const actionItems: DashboardData['teaching']['actionItems'] = [];
  if (awaitingAction > 0) {
    actionItems.push({
      id: 'awaiting',
      text: `Review ${awaitingAction} matched request${awaitingAction === 1 ? '' : 's'} awaiting your response`,
      count: awaitingAction,
      href: '/tutor/earnings',
      icon: 'awaiting',
      iconTone: 'primary',
    });
  }
  if (inactiveExpertiseCount > 0) {
    actionItems.push({
      id: 'inactive',
      text: `${inactiveExpertiseCount} inactive expertise can be reactivated`,
      count: inactiveExpertiseCount,
      href: '/tutor/expertise',
      icon: 'inactive',
      iconTone: 'accent',
    });
  }
  if (profilePercent < 80) {
    actionItems.push({
      id: 'profile',
      text: `Complete your profile (${profilePercent}%) to attract more students`,
      href: '/profile',
      icon: 'profile',
      iconTone: 'info',
    });
  }
  if (userBalance > 0) {
    actionItems.push({
      id: 'withdraw',
      text: `Withdraw ৳${userBalance.toLocaleString()} in available earnings`,
      href: '/tutor/earnings',
      icon: 'withdraw',
      iconTone: 'success',
    });
  }

  // -------- Assigned students (capped for the table) --------
  const assignedStudents = assignedRequestsRaw.slice(0, 10).map((r) => ({
    id: r.id,
    studentName: r.student.name,
    courseName: r.course.name,
    topic: r.topic,
    preferredMode: r.preferredMode,
    preferredDateTime: r.preferredDateTime,
    budget: r.budget,
    status: r.status,
  }));

  // -------- Today's date for header --------
  const today = new Date();
  const todayLong = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // -------- Subtext --------
  const teachingBadge = isTutor
    ? `${activeExpertiseCount} active expertise • ${activeStudentsCount} active student${activeStudentsCount === 1 ? '' : 's'}`
    : 'Not teaching yet';

  const data: DashboardData = {
    firstName,
    todayLong,
    userBalance,
    isTutor,
    teachingBadge,
    learningCount: activeLearningRequests + consultancyCount,
    teaching: {
      activeStudents: activeStudentsCount,
      awaitingAction,
      completedSessions,
      avgRating,
      ratingCount,
      uniqueStudents,
      totalEarnings,
      activeExpertise: activeExpertiseCount,
      inactiveExpertise: inactiveExpertiseCount,
      completionRate,
      profilePercent,
      coursePopularity,
      activity,
      actionItems,
      assignedStudents,
      totalAssigned,
    },
  };

  // -------- Learning panel (server-rendered; passed to client orchestrator) --------
  const learningPanel = (
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h2 className="mb-0">Learning</h2>
        <Link href="/student/request-tutor" className="btn-primary">
          New Request
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Requests" value={activeLearningRequests} icon={<BookOpen size={20} />} />
        <StatCard title="Completed Sessions" value={completedLearningSessions} icon={<CheckCircle size={20} />} />
        <StatCard title="Consultancy Requests" value={consultancyCount} icon={<MessageSquare size={20} />} />
        <StatCard title="Wallet Balance" value={`৳${userBalance.toLocaleString()}`} icon={<History size={20} />} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/find-tutor" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-primary-light text-primary rounded-full">
            <Search size={24} />
          </div>
          <span className="font-semibold">Find a Tutor</span>
        </Link>
        <Link href="/student/request-tutor" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-success-light text-success-hover rounded-full">
            <PlusCircle size={24} />
          </div>
          <span className="font-semibold">Request a Tutor</span>
        </Link>
        <Link href="/consultancy" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-accent-light text-accent-hover rounded-full">
            <MessageSquare size={24} />
          </div>
          <span className="font-semibold">Consultancy</span>
        </Link>
        <Link href="/student/payments" className="card card-hover flex flex-col items-center justify-center p-4 text-center gap-3">
          <div className="p-3 bg-info-light text-info-hover rounded-full">
            <History size={24} />
          </div>
          <span className="font-semibold">Payment History</span>
        </Link>
      </div>

      <div>
        <h3 className="mb-3">Recent Requests</h3>
        <StudentRequestList
          initialRequests={learningRequests.slice(0, 5)}
          userBalance={userBalance}
        />
      </div>
    </section>
  );

  return (
    <DashboardContent
      data={data}
      learningPanel={learningPanel}
      onboarding={needsOnboarding ? <OnboardingGuide firstName={firstName} /> : null}
    />
  );
}
