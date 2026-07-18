import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import DepartmentManager from './DepartmentManager';

export default async function AdminDepartmentsPage() {
  const departments = await getDepartments();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6">Manage Departments</h1>
      <DepartmentManager departments={departments} />
    </div>
  );
}
