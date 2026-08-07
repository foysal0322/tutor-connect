import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, MapPin, Package, ShieldCheck, UserCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { getShopListing } from '@/lib/shop/queries';
import { formatBDT, conditionLabel } from '@/lib/shop/service';
import styles from './listing.module.css';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getShopListing(id);
  if (!listing) return { title: 'Listing not found — nsuOne Shop' };
  return {
    title: `${listing.title} — nsuOne Shop`,
    description: listing.description.slice(0, 160),
    alternates: { canonical: `/shop/listing/${id}` },
  };
}

interface StoredImage {
  url?: string;
  sortOrder?: number;
}

function sortedImages(images: unknown): string[] {
  if (!Array.isArray(images)) return [];
  return (images as StoredImage[])
    .slice()
    .sort((a, b) => {
      const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
      const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
      return sa - sb;
    })
    .map((i) => i.url)
    .filter((u): u is string => typeof u === 'string');
}

export default async function ListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await getShopListing(id);

  if (!listing) {
    notFound();
  }

  const images = sortedImages(listing.images);
  const sellerName =
    listing.seller.shopSellerProfile?.storefrontName ?? listing.seller.name;
  const sellerRating = listing.seller.shopSellerProfile?.avgRating ?? null;
  const sellerSales = listing.seller.shopSellerProfile?.completedSales ?? 0;
  const isSoldOut = listing.quantity <= 0 || listing.status === 'SOLD';

  return (
    <div className={styles.detailWrap}>
      <PageHeader
        title={
          <Link href='/shop' className={styles.backLink}>
            <ArrowLeft size={16} aria-hidden='true' /> Back to Shop
          </Link>
        }
      />

      <div className={styles.layout}>
        <section className={styles.gallery} aria-label='Listing images'>
          {images.length > 0 ? (
            <div className={styles.imageStack}>
              {images.map((url, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={url}
                  alt={`${listing.title} — image ${i + 1}`}
                  className={styles.image}
                  loading={i === 0 ? undefined : 'lazy'}
                />
              ))}
            </div>
          ) : (
            <div className={styles.imagePlaceholder}>
              <Package size={56} aria-hidden='true' />
              <span>No photos provided</span>
            </div>
          )}
        </section>

        <aside className={styles.aside} aria-label='Listing details'>
          <div className={styles.conditionLine}>
            {conditionLabel(listing.condition)}
            {listing.quantity > 1 && !isSoldOut && (
              <> · {listing.quantity} available</>
            )}
          </div>
          <h1 className={styles.title}>{listing.title}</h1>
          <div className={styles.price}>{formatBDT(listing.priceBdt)}</div>

          {listing.location && (
            <div className={styles.locationLine}>
              <MapPin size={14} aria-hidden='true' /> {listing.location}
            </div>
          )}

          <div className={styles.descriptionBlock}>
            <h2 className={styles.descriptionHeading}>Description</h2>
            <p className={styles.description}>{listing.description}</p>
          </div>

          <Link href={`/shop/seller/${listing.seller.id}`} className={styles.sellerCard}>
            <div className={styles.sellerAvatar}>
              <UserCircle size={36} aria-hidden='true' />
            </div>
            <div className={styles.sellerInfo}>
              <div className={styles.sellerName}>{sellerName}</div>
              <div className={styles.sellerMeta}>
                {sellerRating != null && <>★ {sellerRating.toFixed(1)} · </>}
                {sellerSales} sold
              </div>
            </div>
          </Link>

          <div className={styles.trustNote}>
            <ShieldCheck size={16} aria-hidden='true' />
            <span>
              Buying will move funds to escrow. The seller is paid only when
              you confirm delivery. (Live in a later phase.)
            </span>
          </div>

          {isSoldOut ? (
            <button type='button' className={styles.buyBtnDisabled} disabled>
              Sold out
            </button>
          ) : (
            <button type='button' className={styles.buyBtnDisabled} disabled>
              Buy with escrow — coming soon
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}
