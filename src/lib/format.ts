/**
 * Shared formatting helpers for money and other display values.
 * Used by the financial pages (wallet, payments) so amounts render
 * consistently everywhere.
 */

// Formats a BDT amount with thousands separators and 2 decimals.
// Uses the absolute value so callers can prepend a sign for debits.
export function formatBDT(n: number): string {
  return Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Masks an email for display in confirmation messages, e.g. "j***e@gmail.com".
export function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name[0]}***@${domain}`;
  return `${name[0]}***${name[name.length - 1]}@${domain}`;
}
