import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import StatCard from '@/components/ui/StatCard';
import Tabs from '@/components/ui/Tabs';
import StudentRequestList from '@/app/student/StudentRequestList';
import {
  BookOpen,
  CheckCircle,
  MessageSquare,
  Search,
  PlusCircle,
  History,
  UserPlus,
  Users,
  DollarSign,
  BookOpenCheck,
  GraduationCap,
} from 'lucide-react';

/**
 * Unified member dashboard.
 *
 * nsuOne is a unified campus marketplace: every non-admin user is a "Member"
 * who can both learn (request tutors) and teach (offer expertises). This page
 * always shows the Learning section, and shows the Teaching section once the
 * member has at least one active expertise. Teaching capability is derived
 * from data (TutorExpertise rows), NOT from the `role` enum — see
 * src/app/tutor/actions.ts.
 */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string })?.role;
  if (!session || role === 'ADMIN') {
    redirect('/auth/signin?callbackUrl=/dashboard');
  }

  const userId = (session.user as { id: string }).id;
  const firstName = (session.user as { name?: string | null }).name?.split(' ')[0] ?? 'there';

  // ---- Learning data (always) ----
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { balance: true },
  });
  const userBalance = user?.balance || 0;

  const requests = await prisma.tutorRequest.findMany({
    where: { studentId: userId },
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
          department: { select: { name: true } },
        },
      },
      payment: { select: { id: true, mfsType: true, accountNumber: true, amount: true, transactionId: true } },
      refundRequests: {
        select: { id: true, status: true, details: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const consultancyCount = await prisma.consultancyRequest.count({ where: { studentId: userId } });
  const activeRequests = requests.filter((r) =>
    ['PENDING', 'MATCHED', 'PAYMENT_PENDING', 'ACCEPTED'].includes(r.status),
  ).length;
  const completedSessions = requests.filter((r) => r.status === 'COMPLETED').length;

  // ---- Teaching data (only if the member offers at least one expertise) ----
  const activeExpertiseCount = await prisma.tutorExpertise.count({
    where: { tutorId: userId, isActive: true },
  });
  const isTutor = activeExpertiseCount > 0;

  const assignedRequests = isTutor
    ? await prisma.tutorRequest.findMany({
        where: { assignedTutorId: userId },
        select: {
          id: true, topic: true, preferredMode: true, preferredDateTime: true,
          budget: true, status: true, createdAt: true,
          course: { select: { name: true } },
          student: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const activeStudents = assignedRequests.filter((r) => r.status === 'ACCEPTED').length;
  const completedTutorSessions = assignedRequests.filter((r) => r.status === 'COMPLETED').length;
  const totalEarnings = assignedRequests
    .filter((r) => r.status === 'COMPLETED')
    .reduce((sum, req) => sum + req.budget, 0);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="mb-2">Welcome back, {firstName}!</h1>
        <p className="text-muted">
          Your campus hub — learn from peers and teach what you know, all in one place.
        </p>
      </div>

      <Tabs
        tabs={[
          { id: 'learning', label: 'Learning', count: activeRequests + consultancyCount },
          { id: 'teaching', label: 'Teaching', count: isTutor ? activeStudents + activeExpertiseCount : 0 },
        ]}
        panels={{
          learning: (
            <section id="learning" className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="mb-0">Learning</h2>
          <Link href="/student/request-tutor" className="btn-primary">New Request</Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Active Requests" value={activeRequests} icon={<BookOpen size={20} />} />
          <StatCard title="Completed Sessions" value={completedSessions} icon={<CheckCircle size={20} />} />
          <StatCard title="Consultancy Requests" value={consultancyCount} icon={<MessageSquare size={20} />} />
          <StatCard title="Saved Tutors" value={0} icon={<UserPlus size={20} />} />
        </div>

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

        <div>
          <h3 className="mb-4">Recent Requests</h3>
          <StudentRequestList initialRequests={requests.slice(0, 5) as any} userBalance={userBalance} />
        </div>
            </section>
          ),

          teaching: (
      <section id="teaching" className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h2 className="mb-0">Teaching</h2>
          <Link href="/tutor/expertise" className="btn-primary">
            {isTutor ? 'Manage Expertise' : 'Add an Expertise'}
          </Link>
        </div>

        {isTutor ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard title="Active Students" value={activeStudents} icon={<Users size={20} />} />
              <StatCard title="Completed Sessions" value={completedTutorSessions} icon={<CheckCircle size={20} />} />
              <StatCard title="Total Earnings" value={`${totalEarnings} ৳`} icon={<DollarSign size={20} />} />
              <StatCard title="Listed Expertises" value={activeExpertiseCount} icon={<BookOpenCheck size={20} />} />
            </div>

            <div>
              <h3 className="mb-4">My Assigned Students</h3>
              {assignedRequests.length === 0 ? (
                <div className="card text-center p-8 text-muted">
                  You don&apos;t have any assigned students yet.
                </div>
              ) : (
                <div className="data-grid-container">
                  <table className="data-grid hidden md:table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Course</th>
                        <th>Topic</th>
                        <th>Mode</th>
                        <th>Time</th>
                        <th>Budget</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {assignedRequests.map((req) => (
                        <tr key={req.id}>
                          <td><strong>{req.student.name}</strong></td>
                          <td>{req.course.name}</td>
                          <td>{req.topic}</td>
                          <td>{req.preferredMode}</td>
                          <td>{req.preferredDateTime ? new Date(req.preferredDateTime).toLocaleString() : 'N/A'}</td>
                          <td>{req.budget} BDT</td>
                          <td>
                            <span className={`badge ${req.status === 'COMPLETED' ? 'badge-success' : req.status === 'ACCEPTED' ? 'badge-info' : 'badge-warning'}`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="md:hidden flex flex-col gap-4 p-4">
                    {assignedRequests.map((req) => (
                      <div key={req.id} className="card p-4 flex flex-col gap-2">
                        <div className="flex justify-between items-center border-b border-color pb-2">
                          <span className="font-semibold">{req.course.name}</span>
                          <span className={`badge ${req.status === 'COMPLETED' ? 'badge-success' : req.status === 'ACCEPTED' ? 'badge-info' : 'badge-warning'}`}>
                            {req.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Student</span>
                          <strong>{req.student.name}</strong>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Topic</span>
                          <span>{req.topic}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted">Budget</span>
                          <span>{req.budget} BDT</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="card p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-primary-light text-primary rounded-full">
                <GraduationCap size={24} />
              </div>
              <div>
                <h3 className="mb-1">Teach what you know</h3>
                <p className="text-muted mb-0">
                  Offer a course you aced and earn from peers who need help. You can teach and learn at the same time.
                </p>
              </div>
            </div>
            <Link href="/tutor/expertise" className="btn-primary whitespace-nowrap">Add an Expertise</Link>
          </div>
        )}
      </section>
          ),
        }}
      />
    </div>
  );
}
