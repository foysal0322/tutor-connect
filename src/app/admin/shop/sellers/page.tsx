import { Users } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import AdminSuspendSeller from '@/components/shop/AdminSuspendSeller';

export const dynamic = 'force-dynamic';

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

export default async function AdminShopSellersPage() {
  const sellers = await prisma.shopSellerProfile.findMany({
    orderBy: [{ completedSales: 'desc' }],
    take: 100,
    select: {
      userId: true,
      storefrontName: true,
      bio: true,
      isSuspended: true,
      listingCount: true,
      completedSales: true,
      avgRating: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true, isBlocked: true } },
    },
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Sellers'
        subtitle={`${sellers.length} seller profiles.`}
        icon={<Users size={18} aria-hidden='true' />}
      />
      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={th}>Seller</th>
              <th style={th}>Storefront</th>
              <th style={th}>Listings</th>
              <th style={th}>Sales</th>
              <th style={th}>Rating</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {sellers.map((s) => {
              const statusTone: BadgeTone = s.isSuspended ? 'danger' : 'success';
              return (
                <tr key={s.userId} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{s.user.name}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.user.email}</div>
                  </td>
                  <td style={td}>{s.storefrontName ?? <em style={{ color: 'var(--text-muted)' }}>—</em>}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{s.listingCount}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{s.completedSales}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>
                    {s.avgRating != null ? `★ ${s.avgRating.toFixed(1)}` : '—'}
                  </td>
                  <td style={td}>
                    {s.user.isBlocked ? (
                      <Badge tone='danger'>account blocked</Badge>
                    ) : (
                      <Badge tone={statusTone}>{s.isSuspended ? 'suspended' : 'active'}</Badge>
                    )}
                  </td>
                  <td style={td}>
                    <AdminSuspendSeller userId={s.userId} isSuspended={s.isSuspended} userBlocked={s.user.isBlocked} />
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
