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

  if (!session || (session.user as any).role === 'ADMIN') {
    const callbackUrl = courseId
      ? `/student/request-tutor?courseId=${courseId}${tutorId ? `&tutorId=${tutorId}` : ''}`
      : '/student/request-tutor';
    redirect(`/auth/student-signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const courses = await getCourses();

  let selectedTutor = null;
  if (tutorId) {
    selectedTutor = await prisma.user.findFirst({
      where: { id: tutorId, role: { not: 'ADMIN' } },
      include: { expertises: true }
    });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6">Request a Tutor</h1>
      <Suspense fallback={<div className="p-8 text-center"><div className="animate-spin inline-block w-6 h-6 border-[3px] border-current border-t-transparent text-primary rounded-full" /></div>}>
        <RequestTutorForm courses={courses} selectedTutor={selectedTutor} />
      </Suspense>
    </div>
  );
}
