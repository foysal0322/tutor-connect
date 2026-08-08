import Link from 'next/link';
import { Tag } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import AdminListingActions from '@/components/shop/AdminListingActions';
import { formatBDT } from '@/lib/shop/service';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, BadgeTone> = {
  DRAFT: 'neutral',
  PENDING_REVIEW: 'info',
  ACTIVE: 'success',
  PAUSED: 'warning',
  SOLD: 'neutral',
  EXPIRED: 'neutral',
  REJECTED: 'danger',
  REMOVED: 'danger',
};

export default async function AdminShopListingsPage() {
  const listings = await prisma.shopListing.findMany({
    orderBy: [{ updatedAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      title: true,
      status: true,
      priceBdt: true,
      quantity: true,
      condition: true,
      createdAt: true,
      updatedAt: true,
      seller: {
        select: { id: true, name: true, shopSellerProfile: { select: { isSuspended: true } } },
      },
      category: { select: { name: true } },
    },
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader title='Listings' icon={<Tag size={18} aria-hidden='true' />} />

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)', minWidth: 800 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={th}>Listing</th>
              <th style={th}>Seller</th>
              <th style={th}>Category</th>
              <th style={th}>Price</th>
              <th style={th}>Status</th>
              <th style={th}>Updated</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={td}>
                  <Link href={`/shop/listing/${l.id}`} style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}>
                    {l.title}
                  </Link>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                    {l.condition} · qty {l.quantity}
                  </div>
                </td>
                <td style={td}>
                  <Link href={`/admin/shop/sellers?u=${l.seller.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    {l.seller.name}
                  </Link>
                  {l.seller.shopSellerProfile?.isSuspended && (
                    <span style={{ marginLeft: 6, color: 'var(--danger)', fontSize: 'var(--text-xs)' }}>suspended</span>
                  )}
                </td>
                <td style={td}>{l.category?.name ?? '—'}</td>
                <td style={{ ...td, fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatBDT(l.priceBdt)}</td>
                <td style={td}>
                  <Badge tone={STATUS_TONE[l.status] ?? 'neutral'}>
                    {l.status.replace(/_/g, ' ').toLowerCase()}
                  </Badge>
                </td>
                <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                  {new Date(l.updatedAt).toLocaleDateString()}
                </td>
                <td style={td}>
                  <AdminListingActions
                    listingId={l.id}
                    status={l.status}
                    title={l.title}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

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
};
