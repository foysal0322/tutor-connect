import Link from 'next/link';
import {
  ShoppingBag,
  DollarSign,
  PackageSearch,
  Scale,
  Flag,
  TrendingUp,
} from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { KPI } from '@/components/ui/KPI';
import { formatBDTCompact } from '@/lib/shop/service';

export const dynamic = 'force-dynamic';

export default async function AdminShopOverviewPage() {
  // Server component — Date.now() runs once per request on the server.
  // The react-hooks/purity rule fires on render-scope calls; this is safe
  // because the function is async + runs server-side, not in a client
  // component's render pass.
  // eslint-disable-next-line react-hooks/purity
  const since = new Date(Date.now() - 30 * 24 * 3600_000);

  const [
    activeListings,
    openDisputes,
    openReports,
    completed30,
    commission30,
    gmv30,
    recentOrders,
    recentDisputes,
  ] = await Promise.all([
    prisma.shopListing.count({ where: { status: 'ACTIVE' } }),
    prisma.shopDispute.count({
      where: { status: { in: ['OPEN', 'AWAITING_BUYER', 'AWAITING_SELLER', 'ESCALATED'] } },
    }),
    prisma.shopReport.count({ where: { status: 'OPEN' } }),
    prisma.shopOrder.count({
      where: { status: 'COMPLETED', completedAt: { gte: since } },
    }),
    prisma.shopOrder.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: since } },
      _sum: { commissionBdt: true },
    }),
    prisma.shopOrder.aggregate({
      where: { status: 'COMPLETED', completedAt: { gte: since } },
      _sum: { subtotalBdt: true },
    }),
    prisma.shopOrder.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        status: true,
        subtotalBdt: true,
        createdAt: true,
        listing: { select: { id: true, title: true } },
        listingSnapshot: true,
        buyer: { select: { name: true } },
        seller: { select: { name: true } },
      },
    }),
    prisma.shopDispute.findMany({
      where: { status: { in: ['OPEN', 'AWAITING_BUYER', 'AWAITING_SELLER', 'ESCALATED'] } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: {
        id: true,
        reason: true,
        status: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            listing: { select: { id: true, title: true } },
            listingSnapshot: true,
          },
        },
      },
    }),
  ]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Shop'
        subtitle='Campus marketplace overview — last 30 days.'
        icon={<ShoppingBag size={18} aria-hidden='true' />}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <KPI
          label='GMV (30d)'
          value={formatBDTCompact(gmv30._sum.subtotalBdt ?? 0)}
          tone='primary'
          icon={<TrendingUp size={18} />}
          hint={`${completed30} completed orders`}
        />
        <KPI
          label='Commission (30d)'
          value={formatBDTCompact(commission30._sum.commissionBdt ?? 0)}
          tone='success'
          icon={<DollarSign size={18} />}
        />
        <KPI
          label='Active listings'
          value={String(activeListings)}
          tone='info'
          icon={<PackageSearch size={18} />}
          href='/admin/shop/listings'
        />
        <KPI
          label='Open disputes'
          value={String(openDisputes)}
          tone={openDisputes > 0 ? 'danger' : 'neutral'}
          icon={<Scale size={18} />}
          href='/admin/shop/disputes'
        />
        <KPI
          label='Open reports'
          value={String(openReports)}
          tone={openReports > 0 ? 'danger' : 'neutral'}
          icon={<Flag size={18} />}
          href='/admin/shop/reports'
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(280px, 1fr)',
          gap: 'var(--space-4)',
        }}
      >
        <section>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '0 0 var(--space-2) 0' }}>
            Recent orders
          </h2>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
            {recentOrders.length === 0 && (
              <li style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-3)' }}>
                No orders yet.
              </li>
            )}
            {recentOrders.map((o) => {
              const title =
                o.listing?.title ??
                (o.listingSnapshot as { title?: string })?.title ??
                'Item';
              return (
                <li
                  key={o.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--text-sm)',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                      {o.buyer.name} → {o.seller.name} · {new Date(o.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{o.status}</span>
                    <strong style={{ fontVariantNumeric: 'tabular-nums' }}>{o.subtotalBdt.toFixed(0)} BDT</strong>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section>
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 600, margin: '0 0 var(--space-2) 0' }}>
            Open disputes
          </h2>
          {recentDisputes.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-3)' }}>
              No open disputes. 🎉
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {recentDisputes.map((d) => {
                const title =
                  d.order.listing?.title ??
                  (d.order.listingSnapshot as { title?: string })?.title ??
                  'Item';
                return (
                  <li key={d.id}>
                    <Link
                      href={`/admin/shop/disputes/${d.id}`}
                      style={{
                        display: 'block',
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-sm)',
                        textDecoration: 'none',
                        color: 'inherit',
                        fontSize: 'var(--text-sm)',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{title}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>
                        {d.status} · {new Date(d.createdAt).toLocaleDateString()}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
