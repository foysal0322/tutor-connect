import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import StatCard from '@/components/ui/StatCard';
import { Users, BookOpen, CheckCircle, DollarSign, BookOpenCheck } from 'lucide-react';

export default async function TutorDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role === 'ADMIN') {
    redirect('/auth/tutor-signin');
  }

  const tutorId = (session.user as any).id;

  const assignedRequests = await prisma.tutorRequest.findMany({
    where: { assignedTutorId: tutorId },
    select: {
      id: true,
      topic: true,
      preferredMode: true,
      preferredDateTime: true,
      budget: true,
      status: true,
      createdAt: true,
      course: { select: { name: true } },
      student: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' }
  });

  const activeStudents = assignedRequests.filter(r => r.status === 'ACCEPTED').length;
  const completedSessions = assignedRequests.filter(r => r.status === 'COMPLETED').length;
  const totalEarnings = assignedRequests
    .filter(r => r.status === 'COMPLETED')
    .reduce((sum, req) => sum + req.budget, 0);

  const expertiseCount = await prisma.tutorExpertise.count({ where: { tutorId } });

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="mb-2">Welcome back, {(session.user as any).name?.split(' ')[0]}!</h1>
        <p className="text-muted">Here is an overview of your tutoring activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Active Students" value={activeStudents} icon={<Users size={20} />} />
        <StatCard title="Completed Sessions" value={completedSessions} icon={<CheckCircle size={20} />} />
        <StatCard title="Total Earnings" value={`${totalEarnings} ৳`} icon={<DollarSign size={20} />} />
        <StatCard title="Listed Expertises" value={expertiseCount} icon={<BookOpenCheck size={20} />} />
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2>My Assigned Students</h2>
          <Link href="/tutor/expertise" className="btn-primary">Add Expertise</Link>
        </div>
        
        {assignedRequests.length === 0 ? (
          <div className="card text-center p-8 text-muted">
            You don't have any assigned students yet. Add your expertise to get matched!
          </div>
        ) : (
          <div className="data-grid-container">
            <table className="data-grid hidden.md:table">
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
                {assignedRequests.map(req => (
                  <tr key={req.id}>
                    <td><strong>{req.student.name}</strong></td>
                    <td>{req.course.name}</td>
                    <td>{req.topic}</td>
                    <td>{req.preferredMode}</td>
                    <td>{req.preferredDateTime ? new Date(req.preferredDateTime).toLocaleString() : 'N/A'}</td>
                    <td>{req.budget} BDT</td>
                    <td>
                      <span className={`badge ${req.status === 'COMPLETED' ? 'badge-success' : (req.status === 'ACCEPTED' ? 'badge-info' : 'badge-warning')}`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile View */}
            <div className="md:hidden flex flex-col gap-4 p-4">
              {assignedRequests.map(req => (
                <div key={req.id} className="card p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-color pb-2">
                    <span className="font-semibold">{req.course.name}</span>
                    <span className={`badge ${req.status === 'COMPLETED' ? 'badge-success' : (req.status === 'ACCEPTED' ? 'badge-info' : 'badge-warning')}`}>
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
    </div>
  );
}
