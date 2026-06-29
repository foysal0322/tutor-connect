import { prisma } from '@/lib/prisma';
import CourseManager from './CourseManager';

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Manage Courses</h1>
      <CourseManager courses={courses} />
    </div>
  );
}
