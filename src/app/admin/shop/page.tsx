import { PageHeader } from '@/components/ui/PageHeader';
import { ShoppingBag } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

/**
 * Admin Shop hub — Phase 10 will build this out with KPIs, listings queue,
 * orders, disputes, payouts, category CRUD, and settings. Stubbed here so
 * the admin sidebar link resolves. See NSUONE_SHOP_BLUEPRINT.md §16.9.
 */
export default function AdminShopOverviewPage() {
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Shop'
        subtitle='Campus marketplace overview'
        icon={<ShoppingBag size={18} aria-hidden='true' />}
      />
      <EmptyState
        icon={<ShoppingBag size={36} />}
        title='Admin shop tools coming soon'
        description='KPIs, listings moderation, orders, disputes, payouts, category management, and settings will land in Phase 10 of the Shop rollout.'
      />
    </div>
  );
}
