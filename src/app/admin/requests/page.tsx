import { prisma } from '@/lib/prisma';
import RequestManager from './RequestManager';

export default async function AdminRequestsPage() {
  const requests = await prisma.tutorRequest.findMany({
    include: {
      course: true,
      student: true,
      assignedTutor: true,
      payment: true,
      refundRequests: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const tutors = await prisma.user.findMany({
    where: { role: 'TUTOR' },
    include: { expertises: true }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Tutor Requests Management</h1>
      <RequestManager initialRequests={requests} tutors={tutors} />
    </div>
  );
}
