import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { PackageSearch, Plus, Tag, Eye, Star, AlertTriangle } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { PageHeader } from '@/components/ui/PageHeader';
import { KPI } from '@/components/ui/KPI';
import EmptyState from '@/components/ui/EmptyState';
import SellerListingsTable, { type SellerListingRow } from '@/components/shop/SellerListingsTable';
import {
  getSellerDashboardStats,
  listMyShopListings,
} from '@/lib/shop/queries';
import { formatBDT, formatBDTCompact, conditionLabel } from '@/lib/shop/service';
import styles from './selling.module.css';

export const dynamic = 'force-dynamic';

export default async function SellingDashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect('/auth/signin');

  const [stats, listings] = await Promise.all([
    getSellerDashboardStats(userId),
    listMyShopListings(userId),
  ]);

  const rows: SellerListingRow[] = listings.map((l) => ({
    id: l.id,
    title: l.title,
    priceBdt: l.priceBdt,
    quantity: l.quantity,
    condition: l.condition,
    status: l.status as SellerListingRow['status'],
    viewCount: l.viewCount,
    savedCount: l.savedCount,
    createdAt: l.createdAt.toISOString(),
    category: l.category?.name ?? '—',
  }));

  return (
    <div className={styles.wrap}>
      <PageHeader
        title='Selling'
        subtitle='Manage your shop listings, prices, and inventory.'
        icon={<Tag size={18} aria-hidden='true' />}
        actions={
          <Link href='/shop/selling/new' className={styles.newCta}>
            <Plus size={14} aria-hidden='true' /> New listing
          </Link>
        }
      />

      <div className={styles.kpiRow}>
        <KPI
          label='Active'
          value={String(stats.activeCount)}
          tone='success'
          icon={<PackageSearch size={18} />}
        />
        <KPI
          label='Drafts'
          value={String(stats.draftCount)}
          tone='neutral'
        />
        <KPI
          label='Sold'
          value={String(stats.soldCount)}
          tone='info'
        />
        <KPI
          label='Views (all)'
          value={String(stats.totalViews)}
          tone='primary'
          icon={<Eye size={18} />}
        />
        <KPI
          label='Avg rating'
          value={stats.avgRating != null ? stats.avgRating.toFixed(1) : '—'}
          tone='accent'
          icon={<Star size={18} />}
        />
        {stats.reportedCount > 0 && (
          <KPI
            label='Open reports'
            value={String(stats.reportedCount)}
            tone='danger'
            icon={<AlertTriangle size={18} />}
            hint='Awaiting admin review'
          />
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Tag size={36} />}
          title='No listings yet'
          description='List your first item — old textbooks, calculators, lab kits, anything the campus needs.'
          action={
            <Link href='/shop/selling/new' className={styles.newCta}>
              <Plus size={14} aria-hidden='true' /> Create a listing
            </Link>
          }
        />
      ) : (
        <SellerListingsTable rows={rows} />
      )}
    </div>
  );
}
