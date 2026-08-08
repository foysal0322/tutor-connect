import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHeader } from '@/components/ui/PageHeader';
import ShopListingGrid from '@/components/shop/ShopListingGrid';
import EmptyState from '@/components/ui/EmptyState';
import { listShopListings, listShopCategories } from '@/lib/shop/queries';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = await listShopCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) return { title: 'Category not found — nsuOne Shop' };
  return {
    title: `${cat.name} — nsuOne Shop`,
    description: cat.description ?? `Browse ${cat.name} on nsuOne Shop.`,
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const categories = await listShopCategories();
  const cat = categories.find((c) => c.slug === slug);
  if (!cat) notFound();

  const listings = await listShopListings({ categorySlug: slug, limit: 48 });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4) var(--space-8)' }}>
      <PageHeader title={cat.name} subtitle={cat.description ?? undefined} />
      <ShopListingGrid
        listings={listings}
        emptyState={
          <EmptyState
            title={`No listings in ${cat.name} yet`}
            description='Be the first to list something in this category.'
          />
        }
      />
    </div>
  );
}
