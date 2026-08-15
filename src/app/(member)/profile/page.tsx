import { redirect } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import ProfileForm from '@/components/ProfileForm';
import CompletionChecklist from './CompletionChecklist';
import { requireRole } from '@/lib/server/auth-gate';
import { KPI } from '@/components/ui/KPI';
import { GraduationCap, Star, CheckCircle2, BookOpenCheck, ArrowRight, TrendingUp } from 'lucide-react';

/**
 * Unified member profile. The same `ProfileForm` is used for every member —
 * there are no role-specific fields. Replaces the old /student/profile and
 * /tutor/profile routes (which now redirect here).
 *
 * Phase 7 enrichment: when the member has at least one TutorExpertise
 * (data-derived `isTutor`), a read-only **Tutor section** renders above the
 * form with a quick teaching summary + a link to manage expertises. A
 * profile-completion KPI sits at the top for everyone.
 */
export default async function ProfilePage() {
  const session = await requireRole(['STUDENT', 'TUTOR'], 'STUDENT', {
    redirectTo: '/auth/signin?callbackUrl=/profile',
  });

  const userId = (session.user as { id: string }).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    // Session references a user that no longer exists — force a clean sign-out.
    redirect('/auth/force-signout?reason=session-expired');
  }

  const departments = await getDepartments();

  // -------- Tutor summary (read-only) --------
  const [activeExpertiseCount, inactiveExpertiseCount, ratingAgg, completedCount] =
    await Promise.all([
      prisma.tutorExpertise.count({ where: { tutorId: userId, isActive: true } }),
      prisma.tutorExpertise.count({ where: { tutorId: userId, isActive: false } }),
      prisma.tutorRequest.aggregate({
        where: { assignedTutorId: userId, rating: { not: null } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      prisma.tutorRequest.count({
        where: { assignedTutorId: userId, status: 'COMPLETED' },
      }),
    ]);

  const totalExpertise = activeExpertiseCount + inactiveExpertiseCount;
  const isTutor = totalExpertise > 0;
  const avgRating =
    ratingAgg._avg.rating != null
      ? Math.round((ratingAgg._avg.rating as number) * 10) / 10
      : null;
  const ratingCount = ratingAgg._count._all;

  // -------- Profile completion (same 5-field heuristic as dashboard) --------
  const profileFields = {
    hasGender: Boolean(user.gender),
    hasDepartment: Boolean(user.departmentId),
    hasCgpa: user.cgpa !== null && user.cgpa !== undefined,
    hasAnyExpertise: totalExpertise > 0,
    hasActiveExpertise: activeExpertiseCount > 0,
  };
  const filledCount = Object.values(profileFields).filter(Boolean).length;
  const profilePercent = Math.round((filledCount / 5) * 100);

  // What the percentage is made of — surfaced via the "What counts?" modal
  // so the number isn't a mystery.
  const completionItems = [
    { done: profileFields.hasGender, label: 'Add your gender' },
    { done: profileFields.hasDepartment, label: 'Select your department' },
    { done: profileFields.hasCgpa, label: 'Add your CGPA' },
    { done: profileFields.hasAnyExpertise, label: 'Add at least one subject you can teach', href: '/tutor/expertise', tutorOnly: true },
    { done: profileFields.hasActiveExpertise, label: 'Keep one subject actively listed', href: '/tutor/expertise', tutorOnly: true },
  ];

  return (
    <div className="max-w-2xl flex flex-col gap-5">
      <h1 className="mb-0">My Profile</h1>

      {/* ---------- Profile completion KPI (info trigger inline) ---------- */}
      <KPI
        label="Profile Completion"
        value={
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
            }}
          >
            {`${profilePercent}%`}
            <CompletionChecklist items={completionItems} isTutor={isTutor} />
          </span>
        }
        icon={<TrendingUp size={14} />}
        tone={profilePercent >= 80 ? 'success' : profilePercent >= 50 ? 'primary' : 'accent'}
        variant="accent"
        hint={
          profilePercent >= 80
            ? 'Looking good — students trust complete profiles.'
            : 'Boost visibility by completing your profile.'
        }
      />

      {/* ---------- Read-only Tutor section (only when isTutor) ---------- */}
      {isTutor && (
        <section
          className="card"
          style={{
            padding: 'var(--space-5)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-4)',
          }}
          aria-labelledby="tutor-section-title"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 32,
                  height: 32,
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--primary-light)',
                  color: 'var(--primary)',
                }}
              >
                <GraduationCap size={18} />
              </span>
              <h2 id="tutor-section-title" style={{ margin: 0, fontSize: 'var(--text-lg)' }}>
                Teaching Profile
              </h2>
            </div>
            <Link
              href="/tutor/expertise"
              className="btn-secondary"
              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <BookOpenCheck size={14} />
              Manage Expertise
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Tutor stat row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: 'var(--space-4)',
            }}
          >
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                Active Expertise
              </span>
              <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700 }}>
                {activeExpertiseCount}
              </span>
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                Avg Rating
              </span>
              <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {avgRating !== null ? (
                  <>
                    {avgRating}
                    <Star size={16} fill="currentColor" style={{ color: 'var(--accent)' }} />
                  </>
                ) : (
                  '—'
                )}
              </span>
              {ratingCount > 0 && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '0.25rem' }}>
                  ({ratingCount})
                </span>
              )}
            </div>
            <div>
              <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                Completed Sessions
              </span>
              <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                {completedCount}
                {completedCount > 0 && <CheckCircle2 size={16} style={{ color: 'var(--success)' }} />}
              </span>
            </div>
            {inactiveExpertiseCount > 0 && (
              <div>
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500 }}>
                  Inactive
                </span>
                <span style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {inactiveExpertiseCount}
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ---------- Editable profile form ---------- */}
      <ProfileForm user={user} departments={departments} />
    </div>
  );
}
