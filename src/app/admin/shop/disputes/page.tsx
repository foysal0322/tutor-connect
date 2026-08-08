import Link from 'next/link';
import { Scale } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { disputeStatusLabel } from '@/lib/shop/service';

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

export default async function AdminShopDisputesPage() {
  const disputes = await prisma.shopDispute.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      status: true,
      reason: true,
      createdAt: true,
      openedBy: { select: { name: true } },
      order: {
        select: {
          id: true,
          subtotalBdt: true,
          payoutTxId: true,
          listing: { select: { id: true, title: true } },
          listingSnapshot: true,
          buyer: { select: { name: true } },
          seller: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Issues'
        subtitle='Resolve reported problems — refund the buyer or pay the seller.'
        icon={<Scale size={18} aria-hidden='true' />}
      />
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={th}>Issue</th>
              <th style={th}>Item</th>
              <th style={th}>Parties</th>
              <th style={th}>Reason</th>
              <th style={th}>Seller paid?</th>
              <th style={th}>Status</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {disputes.map((d) => {
              const title =
                d.order.listing?.title ??
                (d.order.listingSnapshot as { title?: string })?.title ??
                'Item';
              return (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={td}>
                    <Link href={`/admin/shop/disputes/${d.id}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontSize: 'var(--text-xs)' }}>
                      resolve →
                    </Link>
                  </td>
                  <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {title}
                  </td>
                  <td style={{ ...td, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {d.order.buyer.name} → {d.order.seller.name}
                  </td>
                  <td style={{ ...td, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {d.reason}
                  </td>
                  <td style={td}>
                    {d.order.payoutTxId ? (
                      <span style={{ color: 'var(--success)' }}>yes</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>no (escrowed)</span>
                    )}
                  </td>
                  <td style={td}>
                    <Badge tone={STATUS_TONE[d.status] ?? 'neutral'}>
                      {disputeStatusLabel(d.status)}
                    </Badge>
                  </td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    {new Date(d.createdAt).toLocaleDateString()}
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
