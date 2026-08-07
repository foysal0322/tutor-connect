import type { Metadata } from 'next';
import Link from 'next/link';
import { PackageSearch, Store, Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { KPI } from '@/components/ui/KPI';
import EmptyState from '@/components/ui/EmptyState';
import ShopFilters from '@/components/shop/ShopFilters';
import ShopListingGrid from '@/components/shop/ShopListingGrid';
import {
  listShopListings,
  listShopCategories,
} from '@/lib/shop/queries';
import { formatBDTCompact } from '@/lib/shop/service';
import styles from './shop.module.css';

export const metadata: Metadata = {
  title: 'Campus Shop — nsuOne',
  description:
    'Buy and sell used textbooks, calculators, lab kits, and notes across the NSU campus. Wallet-secured, escrow-protected.',
  alternates: { canonical: '/shop' },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseNum(s: string | undefined): number | undefined {
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

export default async function ShopBrowsePage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const filters = {
    q: single(sp.q),
    categorySlug: single(sp.category),
    condition: single(sp.condition),
    minPrice: parseNum(single(sp.minPrice)),
    maxPrice: parseNum(single(sp.maxPrice)),
    sort: (single(sp.sort) as
      | 'newest'
      | 'price-asc'
      | 'price-desc'
      | 'popular'
      | undefined),
    limit: 24,
  };

  const [listings, categories] = await Promise.all([
    listShopListings(filters),
    listShopCategories(),
  ]);

  // Aggregate counts for the hero KPI strip.
  const totalActive = listings.length; // good enough for v1; replace with count() in Phase 12
  const totalCategories = categories.length;
  const priceMax =
    listings.reduce(
      (m, l) => (l.priceBdt > m ? l.priceBdt : m),
      0,
    );

  return (
    <div className={styles.browseWrap}>
      <PageHeader
        title='NSUOne Shop'
        subtitle='Buy and sell used books, calculators, lab kits, and notes across campus — escrow-secured.'
        icon={<Store size={18} aria-hidden='true' />}
        actions={
          <Link href='/shop/selling' className={styles.sellCta}>
            <Tag size={14} aria-hidden='true' /> List an item
          </Link>
        }
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <KPI
          label='Active listings'
          value={totalActive.toString()}
          tone='primary'
          icon={<PackageSearch size={18} />}
        />
        <KPI
          label='Categories'
          value={totalCategories.toString()}
          tone='info'
          icon={<Tag size={18} />}
        />
        <KPI
          label='Top price'
          value={priceMax > 0 ? formatBDTCompact(priceMax) : '—'}
          tone='accent'
          hint='Highest listing today'
        />
      </div>

      <ShopFilters
        categories={categories.map((c) => ({ slug: c.slug, name: c.name }))}
        current={{
          q: filters.q,
          categorySlug: filters.categorySlug,
          condition: filters.condition,
          minPrice: filters.minPrice ? String(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? String(filters.maxPrice) : undefined,
          sort: filters.sort,
        }}
      />

      <ShopListingGrid
        listings={listings}
        emptyState={
          <EmptyState
            icon={<PackageSearch size={36} />}
            title='No listings match'
            description='Try clearing filters or check back soon — new items are listed every day.'
            action={
              <Link href='/shop/selling' className={styles.sellCta}>
                List an item
              </Link>
            }
          />
        }
      />
    </div>
  );
}
