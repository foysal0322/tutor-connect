import { BookOpen } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import CategoryManager from './CategoryManager';

export const dynamic = 'force-dynamic';

export default async function AdminShopCategoriesPage() {
  const categories = await prisma.shopCategory.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      icon: true,
      commissionRateOverride: true,
      sortOrder: true,
      isActive: true,
      _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
    },
  });

  const serialized = categories.map((c) => ({
    ...c,
    commissionRateOverride: c.commissionRateOverride ?? null,
  }));

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Categories'
        subtitle='Curate the shop taxonomy. Slug is the URL key (kebab-case).'
        icon={<BookOpen size={18} aria-hidden='true' />}
      />
      <CategoryManager initialCategories={serialized} />
    </div>
  );
}
