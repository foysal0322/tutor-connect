import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import ShopListingForm from '@/components/shop/ShopListingForm';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { coerceShopSettings } from '@/lib/shop/policy';
import { getPlatformSettings } from '@/lib/cache';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditListingPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect('/auth/signin');

  const listing = await prisma.shopListing.findUnique({
    where: { id },
    select: {
      id: true,
      sellerId: true,
      title: true,
      description: true,
      categoryId: true,
      condition: true,
      priceBdt: true,
      quantity: true,
      location: true,
      status: true,
    },
  });
  if (!listing) notFound();
  if (listing.sellerId !== userId) {
    redirect('/shop/selling');
  }

  const editableStatuses = ['DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED'];
  if (!editableStatuses.includes(listing.status)) {
    redirect('/shop/selling');
  }

  const [settingsRow, categories] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { id: 'default' } }),
    prisma.shopCategory.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true },
    }),
  ]);
  const settings = coerceShopSettings({
    ...(await getPlatformSettings()),
    shopMinPriceBdt: settingsRow?.shopMinPriceBdt,
    shopMaxPriceBdt: settingsRow?.shopMaxPriceBdt,
  });

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 var(--space-4) var(--space-8)' }}>
      <PageHeader title='Edit listing' subtitle={listing.title} />
      <ShopListingForm
        mode='edit'
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
        minPrice={settings.shopMinPriceBdt}
        maxPrice={settings.shopMaxPriceBdt}
        initial={{
          listingId: listing.id,
          title: listing.title,
          description: listing.description,
          categoryId: listing.categoryId,
          condition: listing.condition,
          priceBdt: String(listing.priceBdt),
          quantity: String(listing.quantity),
          location: listing.location ?? '',
        }}
      />
    </div>
  );
}
