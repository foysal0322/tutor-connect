import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import FindTutorClient from './FindTutorClient';

// Cache for 1 minute — tutor availability changes occasionally
export const revalidate = 60;

export default async function FindTutorPage() {
  const [expertises, departments] = await Promise.all([
    prisma.tutorExpertise.findMany({
      where: { isActive: true },
      select: {
        id: true,
        tutorId: true,
        courseId: true,
        semesterCompleted: true,
        facultyName: true,
        courseGrade: true,
        hideGrade: true,
        availability: true,
        sessionFee: true,
        tutor: {
          select: {
            id: true,
            name: true,
            cgpa: true,
            hideCgpa: true,
            gender: true,
            department: {
              select: { name: true }
            },
            assignedRequests: {
              where: { status: 'COMPLETED' },
              select: {
                id: true,
                rating: true,
                review: true,
                createdAt: true,
                student: { select: { name: true } },
                course: { select: { name: true } }
              }
            }
          }
        },
        course: {
          select: {
            id: true,
            name: true,
            departmentId: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      // Safety limit — prevent unbounded result sets
      take: 200,
    }),
    // Departments change very rarely — cache for 24 hours
    getDepartments(),
  ]);

  const mappedExpertises = expertises.map((exp: any) => {
    const mappedTutor = { ...exp.tutor };
    
    // 1. Privacy for CGPA
    if (mappedTutor.hideCgpa) {
      mappedTutor.cgpa = null;
    }
    
    // 2. Stats calculation
    const completedRequests = mappedTutor.assignedRequests || [];
    mappedTutor.studentsTaught = completedRequests.length;
    
    // 3. Extract and map reviews
    const validReviews = completedRequests
      .filter((r: any) => (r.rating !== null && r.rating > 0) || (r.review && r.review.trim() !== ''))
      .map((r: any) => ({
         id: r.id,
         rating: r.rating || 0,
         review: r.review || '',
         studentName: r.student?.name || 'Anonymous',
         courseName: r.course?.name || 'Unknown Course',
         date: r.createdAt
      }));
      
    mappedTutor.reviews = validReviews;
    
    const ratedReviews = validReviews.filter((r: any) => r.rating > 0);
    mappedTutor.averageRating = ratedReviews.length > 0 
      ? (ratedReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / ratedReviews.length).toFixed(1)
      : null;

    // Clean up
    delete mappedTutor.assignedRequests;
    delete mappedTutor.hideCgpa;
    
    const { hideGrade, ...restExp } = exp;

    return {
      ...restExp,
      courseGrade: hideGrade ? null : exp.courseGrade,
      tutor: mappedTutor
    };
  });

  return (
    <FindTutorClient
      initialExpertises={mappedExpertises as any}
      departments={departments}
    />
  );
}
