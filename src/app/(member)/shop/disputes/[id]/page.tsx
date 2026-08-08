import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import DisputeThread from '@/components/shop/DisputeThread';
import styles from './dispute.module.css';

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DisputeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect('/auth/signin');

  const dispute = await prisma.shopDispute.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      reason: true,
      resolution: true,
      createdAt: true,
      resolvedAt: true,
      openedById: true,
      order: {
        select: {
          id: true,
          buyerId: true,
          sellerId: true,
          listing: { select: { id: true, title: true } },
          listingSnapshot: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          authorId: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  if (!dispute) notFound();
  const isParticipant =
    dispute.order.buyerId === userId || dispute.order.sellerId === userId;
  if (!isParticipant) notFound();

  const listingTitle =
    dispute.order.listing?.title ??
    (dispute.order.listingSnapshot as { title?: string })?.title ??
    'Item';
  const userRole = dispute.order.buyerId === userId ? 'buyer' : 'seller';
  const isOpen =
    dispute.status === 'OPEN' ||
    dispute.status === 'AWAITING_BUYER' ||
    dispute.status === 'AWAITING_SELLER';

  return (
    <div className={styles.wrap}>
      <PageHeader
        title={
          <Link href='/shop/disputes' className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden='true' /> Back to Disputes
          </Link>
        }
        actions={
          <Badge tone={STATUS_TONE[dispute.status] ?? 'neutral'}>
            {dispute.status.replace(/_/g, ' ').toLowerCase()}
          </Badge>
        }
      />

      <div className={styles.card}>
        <div className={styles.metaLine}>
          <Scale size={14} aria-hidden='true' />
          <span>
            Order for <strong>{listingTitle}</strong> — you are the{' '}
            <strong>{userRole}</strong>.
          </span>
        </div>
        <Link
          href={`/shop/orders/${dispute.order.id}`}
          className={styles.orderLink}
        >
          View order →
        </Link>
        {dispute.resolution && (
          <div className={styles.resolutionBox}>
            <div className={styles.resolutionLabel}>Admin resolution</div>
            <p className={styles.resolutionBody}>{dispute.resolution}</p>
          </div>
        )}
      </div>

      <DisputeThread
        disputeId={dispute.id}
        initialMessages={dispute.messages.map((m) => ({
          id: m.id,
          authorId: m.authorId,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
          isOwn: m.authorId === userId,
          authorRole:
            m.authorId === dispute.order.buyerId
              ? 'buyer'
              : m.authorId === dispute.order.sellerId
                ? 'seller'
                : 'admin',
        }))}
        canPost={isOpen}
      />
    </div>
  );
}
