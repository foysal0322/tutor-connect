import { prisma } from "@/lib/prisma";
import TeachingPanelView, {
  TeachCTA,
  type ActionItemDTO,
  type TeachingData,
} from "./TeachingPanelView";
import type { ActivityEntry } from "./RecentActivity";

/**
 * Teaching panel — async server component (Phase 3).
 *
 * Fetches all teaching data server-side and streams into <TeachingPanelView>.
 * For members with no expertise (isTutor === false) this short-circuits to the
 * static <TeachCTA> without hitting the database, so non-tutors get a faster
 * dashboard paint.
 *
 * All queries are identical to the previous page.tsx implementation — just
 * relocated so the panel can be its own Suspense boundary.
 */
export default async function TeachingPanel({
  userId,
  isTutor,
  userBalance,
}: {
  userId: string;
  isTutor: boolean;
  userBalance: number;
}) {
  if (!isTutor) return <TeachCTA />;

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
        id: true, topic: true, facultyName: true, preferredMode: true,
        preferredDateTime: true, budget: true, status: true,
        rating: true, review: true, createdAt: true,
        course: { select: { name: true } },
        student: {
          select: {
            name: true, nsuId: true, gender: true, cgpa: true, hideCgpa: true,
            email: true, contact: true,
            department: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: userId, rating: { not: null } },
      select: { id: true, rating: true, review: true, createdAt: true, course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: userId, status: "ACCEPTED" },
      select: { id: true, createdAt: true, student: { select: { name: true } }, course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.tutorExpertise.findMany({
      where: { tutorId: userId },
      select: { id: true, isActive: true, createdAt: true, course: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.withdrawalRequest.findMany({
      where: { tutorId: userId },
      select: { id: true, status: true, netAmount: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 2,
    }),
    prisma.tutorRequest.aggregate({
      where: { assignedTutorId: userId, rating: { not: null } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    prisma.tutorRequest.aggregate({
      where: { assignedTutorId: userId, status: "COMPLETED" },
      _sum: { budget: true },
    }),
    prisma.tutorRequest.groupBy({
      by: ["status"],
      where: { assignedTutorId: userId },
      _count: { _all: true },
    }),
    prisma.tutorRequest.count({
      where: { assignedTutorId: userId, status: "ACCEPTED" },
    }),
    prisma.tutorRequest.findMany({
      where: { assignedTutorId: userId },
      select: { studentId: true },
      distinct: ["studentId"],
    }),
  ]);

  // -------- Derived teaching metrics --------
  const statusCount: Record<string, number> = {};
  for (const g of terminalCounts) statusCount[g.status] = g._count._all;

  const completedSessions = statusCount.COMPLETED ?? 0;
  const awaitingAction = statusCount.MATCHED ?? 0;
  const totalAssigned = assignedRequestsRaw.length;

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
  // Re-fetch the minimal user fields needed for this calc. The shell fetches
  // balance separately; gender/dept/cgpa are specific to this metric and
  // not worth coupling into the shell data.
  const profileUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { gender: true, departmentId: true, cgpa: true },
  });
  const profileFields = {
    hasGender: Boolean(profileUser?.gender),
    hasDepartment: Boolean(profileUser?.departmentId),
    hasCgpa: profileUser?.cgpa !== null && profileUser?.cgpa !== undefined,
    hasAnyExpertise: activeExpertiseCount + inactiveExpertiseCount > 0,
    hasActiveExpertise: activeExpertiseCount > 0,
  };
  const filledProfileFields = Object.values(profileFields).filter(Boolean).length;
  const profilePercent = Math.round((filledProfileFields / 5) * 100);

  // -------- Activity feed (merge + sort + cap 6) --------
  const activity: ActivityEntry[] = [
    ...reviewsRaw.map((r) => ({
      id: r.id,
      kind: "review" as const,
      title: `Earned a ${r.rating}★ review on ${r.course.name}`,
      meta: r.review ? `"${r.review.slice(0, 80)}${r.review.length > 80 ? "…" : ""}"` : undefined,
      at: r.createdAt,
    })),
    ...recentAcceptedRaw.map((r) => ({
      id: r.id,
      kind: "student" as const,
      title: `${r.student.name} accepted you for ${r.course.name}`,
      at: r.createdAt,
    })),
    ...recentExpertiseRaw.map((e) => ({
      id: e.id,
      kind: "expertise" as const,
      title: `${e.isActive ? "Listed" : "Paused"} expertise in ${e.course.name}`,
      at: e.createdAt,
    })),
    ...recentWithdrawalsRaw.map((w) => ({
      id: w.id,
      kind: "withdrawal" as const,
      title: `Withdrawal ${w.status.toLowerCase()} — ${w.netAmount.toLocaleString()} TK net`,
      at: w.createdAt,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6);

  // -------- Action center items --------
  const actionItems: ActionItemDTO[] = [];
  if (awaitingAction > 0) {
    actionItems.push({
      id: "awaiting",
      text: `Review ${awaitingAction} matched request${awaitingAction === 1 ? "" : "s"} awaiting your response`,
      count: awaitingAction,
      href: "/tutor/earnings",
      icon: "awaiting",
      iconTone: "primary",
    });
  }
  if (inactiveExpertiseCount > 0) {
    actionItems.push({
      id: "inactive",
      text: `${inactiveExpertiseCount} inactive expertise can be reactivated`,
      count: inactiveExpertiseCount,
      href: "/tutor/expertise",
      icon: "inactive",
      iconTone: "accent",
    });
  }
  if (profilePercent < 80) {
    actionItems.push({
      id: "profile",
      text: `Complete your profile (${profilePercent}%) to attract more students`,
      href: "/profile",
      icon: "profile",
      iconTone: "info",
    });
  }
  if (userBalance > 0) {
    actionItems.push({
      id: "withdraw",
      text: `Withdraw ${userBalance.toLocaleString()} TK in available earnings`,
      href: "/tutor/earnings",
      icon: "withdraw",
      iconTone: "success",
    });
  }

  // -------- Assigned students (capped for the table) --------
  // Student contact (email/phone) is stripped server-side unless the session
  // is ACCEPTED (payment verified). Gating in the UI alone would leak the
  // contact in the RSC payload — symmetric with the student side, where the
  // tutor's contact only appears on an active session.
  const assignedStudents = assignedRequestsRaw.slice(0, 10).map((r) => {
    const contactUnlocked = r.status === "ACCEPTED";
    return {
      id: r.id,
      studentName: r.student.name,
      courseName: r.course.name,
      topic: r.topic,
      facultyName: r.facultyName,
      preferredMode: r.preferredMode,
      preferredDateTime: r.preferredDateTime,
      budget: r.budget,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      rating: r.rating,
      review: r.review,
      student: {
        nsuId: r.student.nsuId,
        gender: r.student.gender,
        // Respect the student's hideCgpa privacy flag.
        cgpa: r.student.hideCgpa ? null : r.student.cgpa,
        departmentName: r.student.department?.name ?? null,
        email: contactUnlocked ? r.student.email : null,
        contact: contactUnlocked ? r.student.contact : null,
      },
    };
  });

  const data: TeachingData = {
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
  };

  return <TeachingPanelView data={data} />;
}
