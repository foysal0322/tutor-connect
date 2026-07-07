import { prisma } from '@/lib/prisma';
import { getCourses } from '@/lib/cache';
import RequestTutorForm from './RequestTutorForm';
import { Suspense } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function RequestTutorPage({ searchParams }: { searchParams: Promise<{ courseId?: string; tutorId?: string }> }) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await searchParams;
  const courseId = resolvedParams.courseId;
  const tutorId = resolvedParams.tutorId;

  if (!session || (session.user as any).role !== 'STUDENT') {
    const callbackUrl = courseId
      ? `/student/request-tutor?courseId=${courseId}${tutorId ? `&tutorId=${tutorId}` : ''}`
      : '/student/request-tutor';
    redirect(`/auth/student-signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const courses = await getCourses();

  let selectedTutor = null;
  if (tutorId) {
    selectedTutor = await prisma.user.findFirst({
      where: { id: tutorId, role: 'TUTOR' },
      include: { expertises: true }
    });
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Request a Tutor</h1>
      <Suspense fallback={<div>Loading form...</div>}>
        <RequestTutorForm courses={courses} selectedTutor={selectedTutor} />
      </Suspense>
    </div>
  );
}
