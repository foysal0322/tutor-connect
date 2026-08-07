import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { PageHeader } from '@/components/ui/PageHeader';
import ShopListingForm from '@/components/shop/ShopListingForm';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { coerceShopSettings } from '@/lib/shop/policy';
import { getPlatformSettings } from '@/lib/cache';

export const dynamic = 'force-dynamic';

export default async function NewListingPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }

  const settings = await coerceShopSettings({
    ...(await getPlatformSettings()),
    shopMinPriceBdt: (await prisma.platformSetting.findUnique({ where: { id: 'default' } }))
      ?.shopMinPriceBdt,
    shopMaxPriceBdt: (await prisma.platformSetting.findUnique({ where: { id: 'default' } }))
      ?.shopMaxPriceBdt,
  });

  const categories = await prisma.shopCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: { id: true, name: true },
  });

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '0 var(--space-4) var(--space-8)' }}>
      <PageHeader
        title='New listing'
        subtitle='List an item for the NSUOne campus shop.'
      />
      <ShopListingForm
        mode='create'
        categories={categories.map((c) => ({ value: c.id, label: c.name }))}
        minPrice={settings.shopMinPriceBdt}
        maxPrice={settings.shopMaxPriceBdt}
        initial={{
          title: '',
          description: '',
          categoryId: '',
          condition: 'GOOD',
          priceBdt: '',
          quantity: '1',
          location: '',
        }}
      />
    </div>
  );
}
