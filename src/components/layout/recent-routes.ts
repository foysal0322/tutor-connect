/**
 * recent-routes — lightweight "recently visited" tracker for the command
 * palette (Phase 9).
 *
 * Storage: sessionStorage (scoped to the tab, cleared on close — exactly
 * the right lifetime for "recent" intent; persistent recents across days
 * would feel stale).
 *
 * Schema: string[] of pathnames, newest first, deduped, capped at MAX.
 * The current pathname is excluded when read so the palette never offers
 * "jump to where you already are".
 *
 * Concurrency: sessionStorage is synchronous and single-tab; no locks
 * needed. Reads from the palette happen on open, writes happen on
 * pathname change — they never overlap in a way that loses data.
 */

const KEY = "nsuone.cmd.recent";
const MAX = 6;

function safeRead(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function safeWrite(routes: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(routes));
  } catch {
    /* quota / disabled storage — non-fatal */
  }
}

/** Record a visit. Called by Topbar on pathname change. */
export function pushRecentRoute(pathname: string) {
  if (!pathname || pathname === "/") return;
  const current = safeRead();
  const next = [pathname, ...current.filter((p) => p !== pathname)].slice(0, MAX);
  safeWrite(next);
}

/**
 * Return recents, excluding `exclude` (typically the current pathname)
 * and capped to `limit`. Returns [] during SSR.
 */
export function readRecentRoutes(exclude?: string, limit = 5): string[] {
  const routes = safeRead().filter((p) => p !== exclude);
  return routes.slice(0, limit);
}

/** Test-only: clear recents. */
export function clearRecentRoutes() {
  safeWrite([]);
}
