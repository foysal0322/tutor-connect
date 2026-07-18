import { prisma } from '@/lib/prisma';
import SupportManager from './SupportManager';

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="max-w-full">
      <h1 className="mb-2">Support & Feedback</h1>
      <p className="text-muted mb-6">
        Manage refunds, complaints, and suggestions submitted from the home page.
      </p>
      <SupportManager initialTickets={tickets} />
    </div>
  );
}
