import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardContent, { type DashboardShellData } from './DashboardContent';
import OnboardingGuide from './OnboardingGuide';
import LearningPanel from './sections/LearningPanel';
import TeachingPanel from './sections/TeachingPanel';
import PanelSkeleton from './PanelSkeleton';

/**
 * Unified member dashboard (Phase 3 redesign).
 *
 * The shell fetches only lightweight counts (for the greeting header + tab
 * defaults + onboarding gate). The heavy panel data is fetched inside the
 * panels themselves (async server components), each wrapped in its own
 * <Suspense> boundary so the shell paints immediately and panels stream in.
 *
 * nsuOne is a unified campus marketplace: every non-admin user is a "Member"
 * who can both learn and teach. Teaching capability is data-derived
 * (TutorExpertise rows), NOT from the role enum.
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

  // -------- Shell data: lightweight counts only --------
  // These are all indexed count queries — fast enough to block the shell on,
  // and they let Tabs pick the right default + gate onboarding.
  const [
    user,
    activeExpertiseCount,
    inactiveExpertiseCount,
    activeLearningCount,
    consultancyCount,
    totalLearningRequests,
    activeStudentsCount,
    matchedCount,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    }),
    prisma.tutorExpertise.count({ where: { tutorId: userId, isActive: true } }),
    prisma.tutorExpertise.count({ where: { tutorId: userId, isActive: false } }),
    prisma.tutorRequest.count({
      where: {
        studentId: userId,
        status: { in: ['PENDING', 'MATCHED', 'PAYMENT_PENDING', 'ACCEPTED'] },
      },
    }),
    prisma.consultancyRequest.count({ where: { studentId: userId } }),
    prisma.tutorRequest.count({ where: { studentId: userId } }),
    prisma.tutorRequest.count({
      where: { assignedTutorId: userId, status: 'ACCEPTED' },
    }),
    prisma.tutorRequest.count({
      where: { assignedTutorId: userId, status: 'MATCHED' },
    }),
  ]);

  const userBalance = user?.balance || 0;
  const totalExpertiseCount = activeExpertiseCount + inactiveExpertiseCount;
  const isTutor = totalExpertiseCount > 0;

  // A member with no learning activity, no consultancy requests, and no teaching
  // has nothing to act on — show a guided onboarding panel instead of empty tabs.
  const needsOnboarding =
    !isTutor && totalLearningRequests === 0 && consultancyCount === 0;

  // Tab counts steer the default-active tab (Tabs picks highest).
  const learningCount = activeLearningCount + consultancyCount;
  const teachingCount = activeStudentsCount + matchedCount + activeExpertiseCount;

  const today = new Date();
  const todayLong = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  const shellData: DashboardShellData = {
    firstName,
    todayLong,
    userBalance,
    isTutor,
    learningCount,
    teachingCount,
  };

  // Panels are only constructed when we're NOT in onboarding mode, so their
  // async server-component fetches are skipped entirely for fresh users.
  const learningPanel = needsOnboarding ? null : (
    <Suspense fallback={<PanelSkeleton />}>
      <LearningPanel userId={userId} userBalance={userBalance} />
    </Suspense>
  );
  const teachingPanel = needsOnboarding ? null : (
    <Suspense fallback={<PanelSkeleton />}>
      <TeachingPanel userId={userId} isTutor={isTutor} userBalance={userBalance} />
    </Suspense>
  );

  return (
    <DashboardContent
      data={shellData}
      learningPanel={learningPanel}
      teachingPanel={teachingPanel}
      onboarding={needsOnboarding ? <OnboardingGuide firstName={firstName} /> : null}
    />
  );
}
