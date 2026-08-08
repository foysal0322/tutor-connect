import { getServerSession } from 'next-auth';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, Clock, CheckCircle2 } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import OrderActions from '@/components/shop/OrderActions';
import OpenDisputeButton from '@/components/shop/OpenDisputeButton';
import { getOrderForUser } from '@/lib/shop/orders-queries';
import { formatBDT, orderStatusLabel } from '@/lib/shop/service';
import styles from './order.module.css';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_TONE: Record<string, BadgeTone> = {
  AWAITING_CONFIRMATION: 'neutral',
  ESCROWED: 'info',
  SHIPPED: 'info',
  DELIVERED: 'success',
  COMPLETED: 'success',
  DISPUTED: 'warning',
  REFUNDED: 'neutral',
  CANCELLED: 'neutral',
};

type OrderStatus =
  | 'AWAITING_CONFIRMATION'
  | 'ESCROWED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REFUNDED'
  | 'CANCELLED';

function fmtDate(d: Date | string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default async function OrderDetailPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect('/auth/signin');

  const order = await getOrderForUser(id, userId);
  if (!order) notFound();

  const isBuyer = order.buyer.id === userId;
  const isSeller = order.seller.id === userId;
  const snapshot = (order.listingSnapshot as { title?: string }) ?? {};
  const title = order.listing?.title ?? snapshot.title ?? 'Item';

  const events = order.events.map((e) => ({
    type: e.type,
    note: e.note ?? null,
    at: e.createdAt.toISOString(),
  }));

  return (
    <div className={styles.wrap}>
      <PageHeader
        title={
          <Link href='/shop/orders' className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden='true' /> Back to Orders
          </Link>
        }
        actions={
          <Badge tone={STATUS_TONE[order.status] ?? 'neutral'}>
            {orderStatusLabel(order.status)}
          </Badge>
        }
      />

      <div className={styles.layout}>
        <section className={styles.main}>
          <div className={styles.card}>
            <div className={styles.titleLine}>
              <h1 className={styles.title}>{title}</h1>
              <span className={styles.qty}>×{order.quantity}</span>
            </div>
            <div className={styles.parties}>
              <div>
                <div className={styles.partyLabel}>Buyer</div>
                <div className={styles.partyName}>{order.buyer.name}</div>
              </div>
              <div>
                <div className={styles.partyLabel}>Seller</div>
                <div className={styles.partyName}>{order.seller.name}</div>
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h2 className={styles.cardHeading}>
              <Clock size={14} aria-hidden='true' /> Timeline
            </h2>
            <ol className={styles.timeline}>
              {events.map((e, i) => (
                <li key={i} className={styles.timelineItem}>
                  <span className={styles.timelineDot} aria-hidden='true' />
                  <div>
                    <div className={styles.timelineType}>
                      {e.type.replace(/_/g, ' ').toLowerCase()}
                    </div>
                    {e.note && <div className={styles.timelineNote}>{e.note}</div>}
                    <div className={styles.timelineAt}>{fmtDate(e.at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <aside className={styles.aside}>
          <div className={styles.card}>
            <h2 className={styles.cardHeading}>Money</h2>
            <dl className={styles.dl}>
              <div className={styles.dlRow}>
                <dt>Subtotal</dt>
                <dd>{formatBDT(order.subtotalBdt)}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Quantity</dt>
                <dd>{order.quantity}</dd>
              </div>
              <div className={styles.dlRow}>
                <dt>Unit price</dt>
                <dd>{formatBDT(order.unitPriceBdt)}</dd>
              </div>
              {order.status === 'COMPLETED' && (
                <div className={`${styles.dlRow} ${styles.dlHighlight}`}>
                  <dt>{isSeller ? 'Your payout' : 'Seller payout'}</dt>
                  <dd>{formatBDT(order.payoutBdt)}</dd>
                </div>
              )}
              <div className={`${styles.dlRow} ${styles.dlMuted}`}>
                <dt>Platform fee</dt>
                <dd>{formatBDT(order.commissionBdt)}</dd>
              </div>
            </dl>
            {order.status === 'ESCROWED' && (
              <div className={styles.trustNote}>
                <ShieldCheck size={14} aria-hidden='true' />
                <span>Funds held in escrow until you confirm delivery.</span>
              </div>
            )}
            {order.status === 'DELIVERED' && order.autoFinalizeAt && (
              <div className={styles.trustNote}>
                <CheckCircle2 size={14} aria-hidden='true' />
                <span>
                  Auto-finalizes on {fmtDate(order.autoFinalizeAt)} unless you
                  act.
                </span>
              </div>
            )}
          </div>

          <OrderActions
            orderId={order.id}
            status={order.status as OrderStatus}
            role={isBuyer ? 'buyer' : 'seller'}
          />

          {/* Dispute entry — surface on SHIPPED/DELIVERED/COMPLETED when no
              dispute is currently open. */}
          {(order.status === 'SHIPPED' ||
            order.status === 'DELIVERED' ||
            order.status === 'COMPLETED') && <OpenDisputeButton orderId={order.id} />}
        </aside>
      </div>
    </div>
  );
}
