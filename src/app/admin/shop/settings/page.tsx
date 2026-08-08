import { Settings } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import ShopSettingsManager from './ShopSettingsManager';

export const dynamic = 'force-dynamic';

export default async function AdminShopSettingsPage() {
  const row = await prisma.platformSetting.findUnique({
    where: { id: 'default' },
  });

  const settings = row
    ? { ...row, updatedAt: row.updatedAt.toISOString() }
    : {
        id: 'default',
        shopCommissionRateDefault: 0.07,
        shopAutoFinalizeHours: 72,
        shopDisputeWindowHours: 48,
        shopListingMaxImages: 6,
        shopBoostFeeBdt: 100,
        shopBoostDays: 7,
        shopModerationMode: 'AUTO',
        shopMinPriceBdt: 20,
        shopMaxPriceBdt: 50000,
        shopMaxActiveListingsPerSeller: 50,
        updatedAt: new Date().toISOString(),
      };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Shop Settings'
        subtitle='Configure the marketplace economics and limits.'
        icon={<Settings size={18} aria-hidden='true' />}
      />
      <ShopSettingsManager settings={settings} />
    </div>
  );
}
