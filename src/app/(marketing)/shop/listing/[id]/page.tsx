import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowLeft, MapPin, Package, ShieldCheck, Star, UserCircle } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import BuyButton from '@/components/shop/BuyButton';
import SaveButton from '@/components/shop/SaveButton';
import ReviewForm from '@/components/shop/ReviewForm';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
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

  // Resolve viewer context for the buy button (balance, ownership, auth).
  const session = await getServerSession(authOptions);
  const viewer = session?.user as
    | { id?: string; role?: string }
    | undefined;
  const isSignedIn = !!viewer?.id;
  const isOwner = viewer?.id === listing.seller.id;

  // Fetch viewer state + reviews + existing save in parallel.
  const [viewerRow, reviews, existingSave, pendingReviewOrder] = await Promise.all([
    isSignedIn
      ? prisma.user.findUnique({
          where: { id: viewer!.id! },
          select: { balance: true, emailVerified: true },
        })
      : null,
    prisma.shopReview.findMany({
      where: { listingId: listing.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        rating: true,
        body: true,
        createdAt: true,
        from: { select: { name: true } },
      },
    }),
    isSignedIn
      ? prisma.shopSavedListing.findUnique({
          where: {
            userId_listingId: {
              userId: viewer!.id!,
              listingId: listing.id,
            },
          },
          select: { userId: true },
        })
      : null,
    // If the viewer is a buyer of a COMPLETED order with no review yet, surface the form.
    isSignedIn && !isOwner
      ? prisma.shopOrder.findFirst({
          where: {
            buyerId: viewer!.id!,
            listingId: listing.id,
            status: 'COMPLETED',
            review: null,
          },
          orderBy: { completedAt: 'desc' },
          select: { id: true },
        })
      : null,
  ]);

  const viewerBalance = viewerRow?.balance ?? null;
  const viewerVerified = viewerRow?.emailVerified != null;
  const isSaved = !!existingSave;

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

          {isSignedIn && (
            <SaveButton listingId={listing.id} initiallySaved={isSaved} />
          )}

          <div className={styles.trustNote}>
            <ShieldCheck size={16} aria-hidden='true' />
            <span>
              Buying moves funds to escrow. The seller is paid only when you
              confirm delivery.
            </span>
          </div>

          <BuyButton
            listingId={listing.id}
            priceBdt={listing.priceBdt}
            quantity={listing.quantity}
            isSoldOut={isSoldOut}
            isOwner={isOwner}
            isSignedIn={isSignedIn}
            isVerified={viewerVerified}
            viewerBalance={viewerBalance}
          />
        </aside>
      </div>

      {pendingReviewOrder && (
        <section className={styles.reviewsSection}>
          <ReviewForm
            orderId={pendingReviewOrder.id}
            listingTitle={listing.title}
          />
        </section>
      )}

      <section className={styles.reviewsSection} aria-label='Reviews'>
        <h2 className={styles.reviewsHeading}>
          <Star size={16} aria-hidden='true' /> Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className={styles.noReviews}>
            No reviews yet. Be the first to buy and review this item.
          </p>
        ) : (
          <ul className={styles.reviewList}>
            {reviews.map((r) => (
              <li key={r.id} className={styles.reviewItem}>
                <div className={styles.reviewHeader}>
                  <strong>{r.from.name}</strong>
                  <span className={styles.reviewRating}>
                    {'★'.repeat(r.rating)}
                    <span className={styles.reviewRatingEmpty}>
                      {'★'.repeat(5 - r.rating)}
                    </span>
                  </span>
                  <span className={styles.reviewDate}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {r.body && <p className={styles.reviewBody}>{r.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
