import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import DepartmentManager from './DepartmentManager';

export default async function AdminDepartmentsPage() {
  const departments = await getDepartments();

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Manage Departments</h1>
      <DepartmentManager departments={departments} />
    </div>
  );
}
