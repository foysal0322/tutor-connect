import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import StudentRequestList from './StudentRequestList';

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'STUDENT') {
    redirect('/auth/student-signin?callbackUrl=/student');
  }

  const studentId = (session.user as any).id;

  const requests = await prisma.tutorRequest.findMany({
    where: { studentId },
    include: {
      course: true,
      assignedTutor: {
        include: { department: true }
      },
      payment: true,
      refundRequests: {
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-main)', fontSize: '2rem' }}>My Tutor Requests</h1>
        <Link href="/student/request-tutor" className="btn-primary">New Request</Link>
      </div>

      <StudentRequestList initialRequests={requests} />
    </div>
  );
}
