import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import ProfileForm from '@/components/ProfileForm';
import { adminUpdateUser } from '@/app/actions/admin';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const user = await prisma.user.findUnique({
    where: { id }
  });

  if (!user) {
    notFound();
  }

  const departments = await getDepartments();

  async function handleAdminUpdate(formData: FormData) {
    'use server';
    formData.append('userId', user!.id);
    return adminUpdateUser(formData);
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <Link href="/admin/users" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>&larr; Back to Users</Link>
        <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', margin: 0 }}>Edit User: {user.name}</h1>
      </div>
      <ProfileForm user={user} departments={departments} isAdmin={true} customAction={handleAdminUpdate} />
    </div>
  );
}
