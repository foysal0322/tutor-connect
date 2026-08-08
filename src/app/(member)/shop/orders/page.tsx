import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import OrdersTabs from '@/components/shop/OrdersTabs';
import { listOrdersForUser, getOrderCounts } from '@/lib/shop/orders-queries';
import styles from './orders.module.css';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function OrdersPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect('/auth/signin');

  const sp = await searchParams;
  const tab = (single(sp.tab) as 'buying' | 'selling') ?? 'buying';
  const status = single(sp.status) ?? 'all';

  const [orders, counts] = await Promise.all([
    listOrdersForUser({ role: tab === 'selling' ? 'seller' : 'buyer', userId, status }),
    getOrderCounts(userId),
  ]);

  const totalBuying = counts.buying.reduce((n, r) => n + r._count._all, 0);
  const totalSelling = counts.selling.reduce((n, r) => n + r._count._all, 0);

  return (
    <div className={styles.wrap}>
      <PageHeader
        title='My Orders'
        subtitle='Track your shop purchases and sales.'
        icon={<ShoppingBag size={18} aria-hidden='true' />}
      />

      <OrdersTabs
        activeTab={tab}
        counts={{ buying: totalBuying, selling: totalSelling }}
        currentStatus={status}
        orders={orders.map((o) => ({
          id: o.id,
          status: o.status,
          quantity: o.quantity,
          subtotalBdt: o.subtotalBdt,
          payoutBdt: o.payoutBdt,
          createdAt: o.createdAt.toISOString(),
          updatedAt: o.updatedAt.toISOString(),
          listing: o.listing
            ? { id: o.listing.id, title: o.listing.title }
            : null,
          listingSnapshot: o.listingSnapshot as { title?: string },
          counterparty:
            tab === 'buying'
              ? { id: o.seller.id, name: o.seller.name }
              : { id: o.buyer.id, name: o.buyer.name },
          role: tab,
        }))}
        emptyState={
          <EmptyState
            icon={<ShoppingBag size={36} />}
            title={tab === 'buying' ? 'No purchases yet' : 'No sales yet'}
            description={
              tab === 'buying'
                ? 'Browse the shop and place your first order.'
                : 'List an item and your sales will appear here.'
            }
          />
        }
      />
    </div>
  );
}
