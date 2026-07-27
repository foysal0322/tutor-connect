// Minimal in-process rate limiter.
//
// Why: see FRONTEND_AUDIT.md A6 — auth and OTP endpoints had no throttling,
// leaving them open to brute force and OTP guessing.
//
// Scope: this is an in-memory, single-instance limiter. It is correct for dev
// and for a single-node production deployment. For multi-node production,
// replace `BucketStore` with a Redis (Upstash)-backed implementation that
// keeps the same `rateLimit(key, limit, windowMs)` signature. The call sites
// below will not need to change.

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

let lastSweep = Date.now();
function sweep(now: number) {
  // Best-effort GC: run at most once per minute so we don't tax every call.
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

export interface RateLimitResult {
  ok: boolean;
  limit: number;
  remaining: number;
  resetAt: number; // epoch ms
}

/**
 * Fixed-window rate limiter.
 *
 * Returns `{ ok: false }` once `limit` calls hit the same `key` inside `windowMs`.
 * The window resets `windowMs` after the *first* call in the current window.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  sweep(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, limit, remaining: limit - 1, resetAt: fresh.resetAt };
  }

  if (existing.count >= limit) {
    return { ok: false, limit, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return { ok: true, limit, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// --- Policies used across the app ------------------------------------------

// 10 login attempts per 10 minutes per identifier.
export const LOGIN_RATE_LIMIT = { limit: 10, windowMs: 10 * 60 * 1000 };

// 5 OTP issue requests per 10 minutes per identifier.
export const OTP_ISSUE_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

// 5 OTP verify attempts per 10 minutes per user.
// (6-digit OTP has 10^6 combinations; 5 attempts makes brute force infeasible.)
export const OTP_VERIFY_RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };

// Helper: format a human-friendly "try again later" message.
export function retryMessage(resetAt: number, now: number = Date.now()): string {
  const seconds = Math.ceil((resetAt - now) / 1000);
  if (seconds <= 60) return `Too many attempts. Try again in ${seconds}s.`;
  const minutes = Math.ceil(seconds / 60);
  return `Too many attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
}
