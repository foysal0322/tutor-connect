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

  // Select only the columns StudentRequestList actually renders
  const requests = await prisma.tutorRequest.findMany({
    where: { studentId },
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
      assignedTutor: {
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          cgpa: true,
          gender: true,
          department: { select: { name: true } }
        }
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
          status: true,
          details: true,
          createdAt: true,
        },
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

      <StudentRequestList initialRequests={requests as any} />
    </div>
  );
}
