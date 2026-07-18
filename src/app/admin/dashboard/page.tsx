import { prisma } from '@/lib/prisma';
import StatCard from '@/components/ui/StatCard';
import { Users, GraduationCap, BookOpen, Clock } from 'lucide-react';

export const revalidate = 300;

export default async function AdminDashboard() {
  const [totalStudents, totalTutors, totalRequests, pendingRequests] = await Promise.all([
    prisma.user.count({ where: { role: 'STUDENT' } }),
    prisma.user.count({ where: { role: 'TUTOR' } }),
    prisma.tutorRequest.count(),
    prisma.tutorRequest.count({ where: { status: 'PENDING' } }),
  ]);
  
  return (
    <div className="flex flex-col gap-6">
      <div className="card max-w-3xl mb-6">
        <h2 className="text-xl mb-2">Dashboard Overview</h2>
        <p className="text-muted">Welcome to the nsuOne admin portal.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Students" value={totalStudents} icon={<GraduationCap size={20} />} />
        <StatCard title="Total Tutors" value={totalTutors} icon={<Users size={20} />} />
        <StatCard title="Total Requests" value={totalRequests} icon={<BookOpen size={20} />} />
        <StatCard title="Pending Requests" value={pendingRequests} icon={<Clock size={20} />} />
      </div>
    </div>
  );
}
