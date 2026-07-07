import { prisma } from '@/lib/prisma';
import { getDepartments } from '@/lib/cache';
import TutorRegisterForm from './TutorRegisterForm';

export default async function TutorRegisterPage() {
  const departments = await getDepartments();

  return <TutorRegisterForm departments={departments} />;
}
