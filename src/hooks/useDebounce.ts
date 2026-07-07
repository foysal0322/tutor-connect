import { useState, useEffect } from 'react';

/**
 * Delays updating a value until after the specified delay.
 * Use this for search inputs to avoid querying/filtering on every keystroke.
 *
 * @param value - The value to debounce
 * @param delay - Milliseconds to wait (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const debouncedSearch = useDebounce(searchQuery, 300);
 * // Use debouncedSearch for filtering instead of searchQuery
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
