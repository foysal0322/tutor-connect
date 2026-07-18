import { prisma } from '@/lib/prisma';
import CourseManager from './CourseManager';

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="max-w-full">
      <h1 className="mb-6">Manage Courses</h1>
      <CourseManager courses={courses} />
    </div>
  );
}
