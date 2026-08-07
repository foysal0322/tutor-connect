'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback } from 'react';
import styles from './ShopFilters.module.css';

/**
 * ShopFilters — client-side filter bar for the browse page. Pushes every
 * change into the URL search params so filters are shareable, back-button
 * friendly, and SSR-rendered on the next request.
 */

interface CategoryOption {
  slug: string;
  name: string;
}

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Most viewed' },
];

const CONDITION_OPTIONS = [
  { value: '', label: 'Any condition' },
  { value: 'NEW', label: 'New' },
  { value: 'LIKE_NEW', label: 'Like new' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'FOR_PARTS', label: 'For parts' },
];

export default function ShopFilters({
  categories,
  current,
}: {
  categories: CategoryOption[];
  current: {
    q?: string;
    categorySlug?: string;
    condition?: string;
    minPrice?: string;
    maxPrice?: string;
    sort?: string;
  };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params?.toString() ?? '');
      if (!value) next.delete(key);
      else next.set(key, value);
      // Reset cursor when filters change.
      next.delete('cursor');
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [router, pathname, params],
  );

  const resetAll = () => {
    router.push(pathname);
  };

  const hasAnyFilter =
    !!(current.q || current.categorySlug || current.condition || current.minPrice || current.maxPrice);

  return (
    <div className={styles.bar} role='search'>
      <input
        type='search'
        placeholder='Search items, books, calculators…'
        defaultValue={current.q ?? ''}
        onChange={(e) => update('q', e.target.value)}
        className={styles.search}
        aria-label='Search shop'
      />

      <select
        value={current.categorySlug ?? ''}
        onChange={(e) => update('category', e.target.value)}
        className={styles.select}
        aria-label='Filter by category'
      >
        <option value=''>All categories</option>
        {categories.map((c) => (
          <option key={c.slug} value={c.slug}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={current.condition ?? ''}
        onChange={(e) => update('condition', e.target.value)}
        className={styles.select}
        aria-label='Filter by condition'
      >
        {CONDITION_OPTIONS.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>

      <input
        type='number'
        placeholder='Min BDT'
        defaultValue={current.minPrice ?? ''}
        onBlur={(e) => update('minPrice', e.target.value)}
        className={styles.priceInput}
        aria-label='Minimum price'
        min='0'
      />
      <input
        type='number'
        placeholder='Max BDT'
        defaultValue={current.maxPrice ?? ''}
        onBlur={(e) => update('maxPrice', e.target.value)}
        className={styles.priceInput}
        aria-label='Maximum price'
        min='0'
      />

      <select
        value={current.sort ?? 'newest'}
        onChange={(e) => update('sort', e.target.value)}
        className={styles.select}
        aria-label='Sort order'
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {hasAnyFilter && (
        <button type='button' onClick={resetAll} className={styles.reset}>
          Clear
        </button>
      )}
    </div>
  );
}
