import Link from 'next/link';
import { ImageOff, MapPin } from 'lucide-react';
import { formatBDT, conditionLabel } from '@/lib/shop/service';

/**
 * ShopListingCard — single card in the browse grid. Server-component safe
 * (no client hooks, no event handlers). Rendered inside a grid by the
 * parent. Uses tokens via inline styles + global utility classes.
 */
export interface ShopListingCardData {
  id: string;
  title: string;
  condition: string;
  priceBdt: number;
  quantity: number;
  status: string;
  location?: string | null;
  images?: unknown; // JSON column: [{id,url,sortOrder}]
  seller: {
    id: string;
    name: string;
    shopSellerProfile?: {
      avgRating?: number | null;
      completedSales?: number | null;
      storefrontName?: string | null;
    } | null;
  };
}

interface Props {
  listing: ShopListingCardData;
}

interface StoredImage {
  url?: string;
  sortOrder?: number;
}

function pickFirstImage(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  const arr = (images as StoredImage[]).slice().sort((a, b) => {
    const sa = typeof a.sortOrder === 'number' ? a.sortOrder : 0;
    const sb = typeof b.sortOrder === 'number' ? b.sortOrder : 0;
    return sa - sb;
  });
  return arr[0]?.url ?? null;
}

export default function ShopListingCard({ listing }: Props) {
  const href = `/shop/listing/${listing.id}`;
  const img = pickFirstImage(listing.images);
  const sellerName =
    listing.seller.shopSellerProfile?.storefrontName ?? listing.seller.name;
  const rating = listing.seller.shopSellerProfile?.avgRating ?? null;
  const isSoldOut = listing.quantity <= 0 || listing.status === 'SOLD';

  return (
    <Link
      href={href}
      className='shop-card'
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        textDecoration: 'none',
        color: 'inherit',
        transition:
          'box-shadow var(--duration-fast) var(--ease-standard), transform var(--duration-fast) var(--ease-standard)',
      }}
    >
      <div
        style={{
          position: 'relative',
          aspectRatio: '4 / 3',
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-muted)',
        }}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element -- shop images are user-uploaded, no optimizer pipeline yet (Phase 5)
          <img
            src={img}
            alt={listing.title}
            loading='lazy'
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        ) : (
          <ImageOff size={32} aria-hidden='true' />
        )}
        {isSoldOut && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 'var(--text-sm)',
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            Sold out
          </div>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-1)',
          padding: 'var(--space-3)',
        }}
      >
        <div
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          {conditionLabel(listing.condition)}
          {listing.quantity > 1 && !isSoldOut && ` · ${listing.quantity} in stock`}
        </div>
        <h3
          style={{
            margin: 0,
            fontSize: 'var(--text-base)',
            fontWeight: 600,
            lineHeight: 1.3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            color: 'var(--text-main)',
          }}
        >
          {listing.title}
        </h3>
        <div
          style={{
            fontSize: 'var(--text-lg)',
            fontWeight: 700,
            color: 'var(--primary)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {formatBDT(listing.priceBdt)}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'var(--space-1)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-muted)',
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
            {sellerName}
            {rating != null && (
              <>
                <span aria-hidden='true'>·</span>
                <span title='Seller rating'>
                  ★ {rating.toFixed(1)}
                </span>
              </>
            )}
          </span>
          {listing.location && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
              title='Meet-up location'
            >
              <MapPin size={12} aria-hidden='true' />
              {listing.location}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
