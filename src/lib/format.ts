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
