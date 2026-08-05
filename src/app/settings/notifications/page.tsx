import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import PreferencesMatrix, {
  type CategoryPreference,
} from './PreferencesMatrix';
import { isCategoryLocked } from '@/lib/notifications/preferences';
import { BellOff } from 'lucide-react';

export const revalidate = 0;

// /settings/notifications — Phase 10 Notification Preferences.
//
// Per-category × per-channel matrix. EMAIL and PUSH are user-mutable; IN_APP
// is rendered as always-on (read-only). AUTH/SECURITY categories are locked
// (CRITICAL priority bypass enforced in dispatch — see preferences.ts).
//
// Accessible to every authenticated role. Admins see the same surface;
// their system-facing notifications (admin in-app rows) are not subject to
// this matrix.
const VISIBLE_CATEGORIES = [
  'TUTOR_REQUEST',
  'BOOKING',
  'PAYMENT',
  'WALLET',
  'WITHDRAWAL',
  'REFUND',
  'CONSULTANCY',
  'SUPPORT',
  'COURSE',
  'SYSTEM',
  'AUTH',
  'SECURITY',
];

export default async function NotificationPreferencesPage() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    redirect('/auth/signin?callbackUrl=/settings/notifications');
  }

  const userId = (session.user as any).id;
  const role = (session.user as any).role || 'STUDENT';

  const rows = await prisma.notificationPreference.findMany({
    where: { userId },
    select: {
      category: true,
      channelInApp: true,
      channelEmail: true,
      channelPush: true,
    },
  });
  const stored = new Map(rows.map((r) => [r.category, r]));

  const categories: CategoryPreference[] = VISIBLE_CATEGORIES.map((category) => ({
    category,
    locked: isCategoryLocked(category),
    channelInApp: true,
    channelEmail: stored.get(category)?.channelEmail ?? true,
    channelPush: stored.get(category)?.channelPush ?? true,
  }));

  return (
    <DashboardLayout
      role={role}
      userName={session.user?.name}
      userEmail={session.user?.email}
    >
      <PageHeader
        title='Notification Preferences'
        subtitle='Choose which events reach your inbox, your phone, or both. Critical security events always deliver.'
        icon={<BellOff size={18} aria-hidden='true' />}
      />

      <PreferencesMatrix initialCategories={categories} />
    </DashboardLayout>
  );
}
