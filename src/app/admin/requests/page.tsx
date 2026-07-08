import { prisma } from '@/lib/prisma';
import RequestManager from './RequestManager';

export default async function AdminRequestsPage() {
  // Use select to fetch only the columns rendered in the UI — exclude password hashes
  const [requests, tutors] = await Promise.all([
    prisma.tutorRequest.findMany({
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
        course: {
          select: { id: true, name: true }
        },
        student: {
          select: { id: true, name: true, nsuId: true, email: true }
        },
        assignedTutor: {
          select: { id: true, name: true, email: true }
        },
        payment: {
          select: {
            id: true,
            mfsType: true,
            accountNumber: true,
            amount: true,
            transactionId: true,
          }
        },
        refundRequests: {
          select: {
            id: true,
            details: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.user.findMany({
      where: { role: 'TUTOR', isBlocked: false },
      select: {
        id: true,
        name: true,
        email: true,
        expertises: {
          where: { isActive: true },
          select: { courseId: true, sessionFee: true }
        }
      }
    }),
  ]);

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Tutor Requests Management</h1>
      <RequestManager initialRequests={requests as any} tutors={tutors} />
    </div>
  );
}
