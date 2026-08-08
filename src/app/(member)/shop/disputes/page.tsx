import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Scale } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { disputeStatusLabel } from '@/lib/shop/service';
import styles from './disputes.module.css';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: 'warning',
  AWAITING_SELLER: 'warning',
  AWAITING_BUYER: 'warning',
  RESOLVED_BUYER: 'success',
  RESOLVED_SELLER: 'success',
  ESCALATED: 'danger',
  CLOSED: 'neutral',
};

export default async function MyDisputesPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect('/auth/signin');

  const disputes = await prisma.shopDispute.findMany({
    where: {
      OR: [
        { order: { buyerId: userId } },
        { order: { sellerId: userId } },
        { openedById: userId },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      order: {
        select: {
          id: true,
          listing: { select: { id: true, title: true } },
          listingSnapshot: true,
          buyerId: true,
          sellerId: true,
        },
      },
    },
  });

  return (
    <div className={styles.wrap}>
      <PageHeader
        title='Order Issues'
        subtitle='Problems you reported on orders, or ones that involve you.'
        icon={<Scale size={18} aria-hidden='true' />}
      />
      {disputes.length === 0 ? (
        <EmptyState
          icon={<Scale size={36} />}
          title='No issues reported'
          description='If something goes wrong with an order — wrong item, never delivered, condition mismatch — you can report it from the order detail page.'
        />
      ) : (
        <ul className={styles.list}>
          {disputes.map((d) => {
            const listingTitle =
              d.order.listing?.title ??
              (d.order.listingSnapshot as { title?: string })?.title ??
              'Item';
            const role = d.order.buyerId === userId ? 'buyer' : 'seller';
            return (
              <li key={d.id}>
                <Link href={`/shop/disputes/${d.id}`} className={styles.row}>
                  <div className={styles.rowMain}>
                    <div className={styles.rowTitle}>{listingTitle}</div>
                    <div className={styles.rowMeta}>
                      You are the <strong>{role}</strong>
                      <span aria-hidden='true'> · </span>
                      {new Date(d.createdAt).toLocaleDateString()}
                    </div>
                    <div className={styles.rowReason}>{d.reason}</div>
                  </div>
                  <Badge tone={STATUS_TONE[d.status] ?? 'neutral'}>
                    {disputeStatusLabel(d.status)}
                  </Badge>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
