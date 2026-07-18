import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import ProfileForm from '@/components/ProfileForm';
import { adminUpdateUser } from '@/app/actions/admin';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

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
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/users" className="text-primary hover:text-primary-hover flex items-center gap-1 font-semibold transition-colors">
          <ArrowLeft size={18} />
          Back to Users
        </Link>
      </div>
      <h1 className="mb-6">Edit User: {user.name}</h1>
      <ProfileForm user={user} departments={departments} isAdmin={true} customAction={handleAdminUpdate} />
    </div>
  );
}
