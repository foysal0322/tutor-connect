import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import NotificationCenterClient, {
  type NotificationListItem,
} from './NotificationCenterClient';
import { Bell } from 'lucide-react';

export const revalidate = 0; // Dynamic on every request.

// /notifications — Phase 8 shared Notification Center.
//
// Works for every authenticated role (STUDENT / TUTOR / ADMIN). The role is
// detected server-side so the DashboardLayout renders the correct sidebar.
// The bell dropdown stays the 5-item preview; this page is the full inbox
// with filters, infinite scroll, bulk actions, and per-item archive.
export default async function NotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/auth/signin?callbackUrl=/notifications');
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role || 'STUDENT';

  // Initial page render fetches the first batch server-side so the page
  // paints with content before the client hydrates. The client component
  // takes over from here for pagination, filtering, and mutations.
  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId, archived: false },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: {
        id: true,
        title: true,
        message: true,
        actionUrl: true,
        isRead: true,
        readAt: true,
        type: true,
        category: true,
        priority: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId, isRead: false, archived: false },
    }),
  ]);

  // Serialize dates for the client component (Date → ISO string).
  const initial: NotificationListItem[] = items.map((n) => ({
    ...n,
    createdAt: n.createdAt.toISOString(),
    readAt: n.readAt ? n.readAt.toISOString() : null,
  }));

  const nextCursor = items.length === 30 ? items[items.length - 1].id : null;

  return (
    <DashboardLayout
      role={role}
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      <PageHeader
        title='Notifications'
        subtitle='Your full activity feed — filter, archive, and act on every event.'
        icon={<Bell size={18} aria-hidden='true' />}
      />
      <NotificationCenterClient
        initialItems={initial}
        initialUnreadCount={unreadCount}
        initialCursor={nextCursor}
      />
    </DashboardLayout>
  );
}
