import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import PaymentsView from './PaymentsView';

export default async function StudentPaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role === 'ADMIN') {
    redirect('/auth/signin?callbackUrl=/student/payments');
  }

  const studentId = (session.user as any).id;

  const requests = await prisma.tutorRequest.findMany({
    where: {
      studentId,
      payment: { isNot: null }
    },
    include: {
      course: true,
      payment: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Requests awaiting payment (tutor matched, not yet paid) shown in the
  // Pending Payments section above the history table.
  const pendingRequests = await prisma.tutorRequest.findMany({
    where: {
      studentId,
      status: 'MATCHED',
    },
    include: {
      course: true,
      assignedTutor: { include: { department: { select: { name: true } } } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { balance: true },
  });
  const userBalance = user?.balance ?? 0;

  return (
    <div className="max-w-full">
      <h1 className="mb-1 text-2xl">Payments</h1>
      <p className="text-muted mb-4">
        Complete pending payments for your matched tutors and track your submitted payment history.
      </p>
      <PaymentsView
        requests={requests}
        pendingRequests={pendingRequests}
        userBalance={userBalance}
      />
    </div>
  );
}
