import { prisma } from '@/lib/prisma';
import SupportManager from './SupportManager';

export default async function AdminSupportPage() {
  const tickets = await prisma.supportTicket.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Support & Feedback</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Manage refunds, complaints, and suggestions submitted from the home page.
      </p>
      <SupportManager initialTickets={tickets} />
    </div>
  );
}
