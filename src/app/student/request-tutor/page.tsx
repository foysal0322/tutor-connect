import { prisma } from '@/lib/prisma';
import RequestTutorForm from './RequestTutorForm';

export default async function RequestTutorPage() {
  const courses = await prisma.course.findMany({
    orderBy: { name: 'asc' },
    include: { department: true }
  });

  return (
    <div className="animate-fade-in" style={{ maxWidth: '600px' }}>
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Request a Tutor</h1>
      <RequestTutorForm courses={courses} />
    </div>
  );
}
