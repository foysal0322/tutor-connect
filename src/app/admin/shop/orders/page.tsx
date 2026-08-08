import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { formatBDT } from '@/lib/shop/service';

export const dynamic = 'force-dynamic';

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

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--space-3)',
  fontSize: 'var(--text-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: 600,
  borderBottom: '1px solid var(--border-color)',
};

const td: React.CSSProperties = {
  padding: 'var(--space-3)',
  verticalAlign: 'middle',
  fontSize: 'var(--text-sm)',
};

export default async function AdminShopOrdersPage() {
  const orders = await prisma.shopOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      status: true,
      quantity: true,
      subtotalBdt: true,
      payoutBdt: true,
      commissionBdt: true,
      createdAt: true,
      listing: { select: { id: true, title: true } },
      listingSnapshot: true,
      buyer: { select: { id: true, name: true } },
      seller: { select: { id: true, name: true } },
    },
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Orders'
        subtitle={`${orders.length} most recent orders.`}
        icon={<ShoppingBag size={18} aria-hidden='true' />}
      />
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={th}>Order</th>
              <th style={th}>Item</th>
              <th style={th}>Buyer</th>
              <th style={th}>Seller</th>
              <th style={th}>Subtotal</th>
              <th style={th}>Payout</th>
              <th style={th}>Fee</th>
              <th style={th}>Status</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const title =
                o.listing?.title ??
                (o.listingSnapshot as { title?: string })?.title ??
                'Item';
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={td}>
                    <Link href={`/shop/orders/${o.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 'var(--text-xs)' }}>
                      view
                    </Link>
                  </td>
                  <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title} ×{o.quantity}
                  </td>
                  <td style={td}>{o.buyer.name}</td>
                  <td style={td}>{o.seller.name}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatBDT(o.subtotalBdt)}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums', color: 'var(--success)' }}>{formatBDT(o.payoutBdt)}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{formatBDT(o.commissionBdt)}</td>
                  <td style={td}>
                    <Badge tone={STATUS_TONE[o.status] ?? 'neutral'}>
                      {o.status.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    {new Date(o.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
