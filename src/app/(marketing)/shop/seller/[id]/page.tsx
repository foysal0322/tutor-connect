import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Star, UserCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import ShopListingGrid from '@/components/shop/ShopListingGrid';
import EmptyState from '@/components/ui/EmptyState';
import {
  getShopSeller,
  listShopListingsBySeller,
} from '@/lib/shop/queries';
import styles from './seller.module.css';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const seller = await getShopSeller(id);
  if (!seller) return { title: 'Seller not found — nsuOne Shop' };
  const name = seller.shopSellerProfile?.storefrontName ?? seller.name;
  return { title: `${name} — nsuOne Shop Seller` };
}

export default async function SellerProfilePage({ params }: PageProps) {
  const { id } = await params;
  const [seller, listings] = await Promise.all([
    getShopSeller(id),
    listShopListingsBySeller(id, 48),
  ]);

  if (!seller) notFound();

  const profile = seller.shopSellerProfile;
  const displayName = profile?.storefrontName ?? seller.name;
  const rating = profile?.avgRating ?? null;
  const sales = profile?.completedSales ?? 0;

  return (
    <div className={styles.wrap}>
      <PageHeader
        title={
          <Link href='/shop' className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden='true' /> Back to Shop
          </Link>
        }
      />

      <section className={styles.profileCard}>
        <div className={styles.avatar}>
          <UserCircle size={56} aria-hidden='true' />
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.name}>{displayName}</h1>
          {profile?.bio && <p className={styles.bio}>{profile.bio}</p>}
          <div className={styles.stats}>
            <span className={styles.stat}>
              <Star size={14} aria-hidden='true' />
              {rating != null ? rating.toFixed(1) : 'New seller'}
            </span>
            <span className={styles.stat}>{sales} sold</span>
            <span className={styles.stat}>{listings.length} active</span>
          </div>
        </div>
      </section>

      <h2 className={styles.listingsHeading}>Active listings</h2>
      <ShopListingGrid
        listings={listings}
        emptyState={
          <EmptyState
            title='No active listings'
            description='This seller has nothing listed right now.'
          />
        }
      />
    </div>
  );
}
