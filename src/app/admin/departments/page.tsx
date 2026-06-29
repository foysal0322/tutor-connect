import { prisma } from '@/lib/prisma';
import DepartmentManager from './DepartmentManager';

export default async function AdminDepartmentsPage() {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Manage Departments</h1>
      <DepartmentManager departments={departments} />
    </div>
  );
}
