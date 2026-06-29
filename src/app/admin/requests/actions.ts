'use server';

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function assignTutorToRequest(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== 'ADMIN') {
    throw new Error('Not authorized');
  }

  const requestId = formData.get('requestId') as string;
  const tutorId = formData.get('tutorId') as string;

  await prisma.tutorRequest.update({
    where: { id: requestId },
    data: {
      assignedTutorId: tutorId,
      status: 'MATCHED'
    }
  });

  revalidatePath('/admin/requests');
}
