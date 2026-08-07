import ShopListingCard, { type ShopListingCardData } from './ShopListingCard';

/**
 * ShopListingGrid — responsive auto-fit grid of ShopListingCards. Wraps in
 * a CSS grid using `auto-fill, minmax(min(100%, 240px), 1fr)` so it
 * gracefully degrades from 5-up on wide screens to 1-up on phones.
 */
export default function ShopListingGrid({
  listings,
  emptyState,
}: {
  listings: ShopListingCardData[];
  emptyState?: React.ReactNode;
}) {
  if (listings.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }
  return (
    <div
      style={{
        display: 'grid',
        gap: 'var(--space-4)',
        gridTemplateColumns:
          'repeat(auto-fill, minmax(min(100%, 240px), 1fr))',
      }}
    >
      {listings.map((l) => (
        <ShopListingCard key={l.id} listing={l} />
      ))}
    </div>
  );
}
