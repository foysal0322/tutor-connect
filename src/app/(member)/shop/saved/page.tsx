import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ShopListingGrid from '@/components/shop/ShopListingGrid';
import styles from '../selling/selling.module.css';

export const dynamic = 'force-dynamic';

export default async function SavedListingsPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session || !session.user || role === 'ADMIN') {
    redirect('/auth/signin');
  }
  const userId = (session.user as { id?: string }).id;
  if (!userId) redirect('/auth/signin');

  const saves = await prisma.shopSavedListing.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          description: true,
          condition: true,
          priceBdt: true,
          quantity: true,
          status: true,
          location: true,
          images: true,
          viewCount: true,
          savedCount: true,
          soldCount: true,
          boostedUntil: true,
          createdAt: true,
          updatedAt: true,
          seller: {
            select: {
              id: true,
              name: true,
              shopSellerProfile: {
                select: {
                  avgRating: true,
                  completedSales: true,
                  storefrontName: true,
                },
              },
            },
          },
          category: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  });

  const listings = saves
    .filter((s) => s.listing && s.listing.status === 'ACTIVE')
    .map((s) => s.listing);

  return (
    <div className={styles.wrap}>
      <PageHeader
        title='Saved'
        subtitle='Items you bookmarked for later.'
        icon={<Bookmark size={18} aria-hidden='true' />}
      />
      {listings.length === 0 ? (
        <EmptyState
          icon={<Bookmark size={36} />}
          title='Nothing saved yet'
          description='Tap the bookmark on any listing to revisit it here.'
        />
      ) : (
        <ShopListingGrid listings={listings} />
      )}
    </div>
  );
}
