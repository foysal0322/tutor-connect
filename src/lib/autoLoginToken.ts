/**
 * Stateless, short-lived auto-login tokens.
 *
 * Issued by the email-verification server actions right after a successful
 * OTP verification, and redeemed once by the credentials provider in
 * src/lib/auth.ts — so a freshly verified user lands in their dashboard
 * without typing their password a second time.
 *
 * Format: `${userId}.${expiresAtMs}.${hmac}` — HMAC-SHA256 over the
 * `userId.expiresAtMs` payload using NEXTAUTH_SECRET. No DB row needed;
 * the 5-minute window bounds replay.
 */
import crypto from 'crypto';

const AUTO_LOGIN_TTL_MS = 5 * 60 * 1000;

function secret() {
  return process.env.NEXTAUTH_SECRET ?? 'dev-only-insecure-secret';
}

function hmac(payload: string) {
  return crypto.createHmac('sha256', secret()).update(payload).digest('hex');
}

export function signAutoLoginToken(userId: string) {
  const expiresAt = Date.now() + AUTO_LOGIN_TTL_MS;
  const payload = `${userId}.${expiresAt}`;
  return `${payload}.${hmac(payload)}`;
}

/** Returns the userId for a valid, unexpired token; null otherwise. */
export function verifyAutoLoginToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [userId, expiresAtStr, sig] = parts;
  const expiresAt = Number(expiresAtStr);
  if (!userId || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  const expected = hmac(`${userId}.${expiresAtStr}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
}
