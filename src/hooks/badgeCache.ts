// Phase 12: tiny in-memory cache for the unread badge count.
//
// The bell polls every 30s when no realtime transport is active. With
// multiple tabs open, the badge endpoint gets hammered N×. This module
// dedupes concurrent fetches within a short window (5s) so all callers see
// the same cached value. The cache is intentionally per-tab (module-scoped)
// — there's no cross-tab state because the SSE transport handles genuine
// realtime, and the HTTP cache header on the endpoint handles the cross-tab
// dedupe at the browser level.
//
// The cache is INVALIDATED by any local mutation (mark-read, archive) via
// `invalidateBadge()`, so optimistic UI never gets stuck showing a stale
// number.

const TTL_MS = 5_000;

let cachedCount: number | null = null;
let cachedAt = 0;
let inflight: Promise<number> | null = null;

export function getCachedBadge(): number | null {
  if (cachedCount === null) return null;
  if (Date.now() - cachedAt > TTL_MS) {
    cachedCount = null;
    return null;
  }
  return cachedCount;
}

// Fetch the unread count with single-flight dedupe. If a request is already
// in flight, callers share its result rather than issuing a parallel one.
export async function fetchBadgeCount(): Promise<number> {
  // Hot path: cache is fresh.
  const cached = getCachedBadge();
  if (cached !== null) return cached;

  // Single-flight: if a fetch is already running, await it.
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', { cache: 'no-store' });
      if (!res.ok) throw new Error(`badge fetch failed: ${res.status}`);
      const data = await res.json();
      const count = Number(data.unreadCount ?? 0);
      cachedCount = count;
      cachedAt = Date.now();
      return count;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

// Optimistic invalidation. Call this whenever the user marks-read or
// archives locally — the next badge poll will re-fetch the truth.
export function invalidateBadge(): void {
  cachedCount = null;
  cachedAt = 0;
}

// Optimistic decrement. Call after a successful single-mark-read so the
// badge updates immediately without a round trip.
export function decrementBadge(): void {
  if (cachedCount !== null) {
    cachedCount = Math.max(0, cachedCount - 1);
    cachedAt = Date.now();
  }
}

// Optimistic override — used when SSE gives us a fresh count we trust
// completely.
export function setBadgeCount(count: number): void {
  cachedCount = Math.max(0, count);
  cachedAt = Date.now();
}
