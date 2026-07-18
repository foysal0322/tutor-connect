import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import StudentRequestList from './StudentRequestList';
import StatCard from '@/components/ui/StatCard';
import { BookOpen, CheckCircle, MessageSquare, Search, PlusCircle, History, UserPlus } from 'lucide-react';

export default async function StudentDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'STUDENT') {
    redirect('/auth/student-signin?callbackUrl=/student');
  }

  const studentId = (session.user as any).id;

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
      course: { select: { id: true, name: true } },
      assignedTutor: {
        select: {
          id: true, name: true, email: true, contact: true, cgpa: true, gender: true,
          department: { select: { name: true } }
        }
      },
      payment: {
        select: { id: true, mfsType: true, accountNumber: true, amount: true, transactionId: true }
      },
      refundRequests: {
        select: { id: true, status: true, details: true, createdAt: true },
        orderBy: { createdAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  const consultancyCount = await prisma.consultancyRequest.count({ where: { studentId } });

  const activeRequests = requests.filter(r => ['PENDING', 'MATCHED', 'PAYMENT_PENDING', 'ACCEPTED'].includes(r.status)).length;
  const completedSessions = requests.filter(r => r.status === 'COMPLETED').length;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-2">Welcome back, {(session.user as any).name?.split(' ')[0]}!</h1>
        <p className="text-muted">Here is an overview of your tutoring journey.</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Requests" value={activeRequests} icon={<BookOpen size={20} />} />
        <StatCard title="Completed Sessions" value={completedSessions} icon={<CheckCircle size={20} />} />
        <StatCard title="Consultancy Requests" value={consultancyCount} icon={<MessageSquare size={20} />} />
        <StatCard title="Saved Tutors" value={0} icon={<UserPlus size={20} />} />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/find-tutor" className="card card-hover flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="p-3 bg-primary-light text-primary rounded-full"><Search size={24} /></div>
            <span className="font-semibold">Find a Tutor</span>
          </Link>
          <Link href="/student/request-tutor" className="card card-hover flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="p-3 bg-success-light text-success-hover rounded-full"><PlusCircle size={24} /></div>
            <span className="font-semibold">Request a Tutor</span>
          </Link>
          <Link href="/consultancy" className="card card-hover flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="p-3 bg-accent-light text-accent-hover rounded-full"><MessageSquare size={24} /></div>
            <span className="font-semibold">Consultancy</span>
          </Link>
          <Link href="/student/payments" className="card card-hover flex flex-col items-center justify-center p-6 text-center gap-3">
            <div className="p-3 bg-info-light text-info-hover rounded-full"><History size={24} /></div>
            <span className="font-semibold">Payment History</span>
          </Link>
        </div>
      </div>

      {/* Recent Requests */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2>Recent Requests</h2>
          <Link href="/student/request-tutor" className="btn-primary">New Request</Link>
        </div>
        <StudentRequestList initialRequests={requests.slice(0, 5) as any} />
      </div>
    </div>
  );
}
