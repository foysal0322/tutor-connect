import React from 'react';
import { Badge, BadgeTone } from './Badge';

/**
 * StatusBadge — domain-aware badge for the app's status enums.
 *
 * Single source of truth for label + color across every page that shows a
 * status pill. Adding a new status means editing one map, not 11 files.
 *
 * See FRONTEND_AUDIT.md E7.
 */

type ToneMap<S extends string> = { [K in S]: { label: string; tone: BadgeTone } };

// --- Request lifecycle -----------------------------------------------------

const REQUEST_STATUS: ToneMap<string> = {
  PENDING: { label: 'Pending', tone: 'neutral' },
  MATCHED: { label: 'Matched', tone: 'info' },
  PAYMENT_PENDING: { label: 'Payment Pending', tone: 'warning' },
  ACCEPTED: { label: 'Accepted', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
};

// --- Payment methods -------------------------------------------------------

const PAYMENT_METHOD: ToneMap<string> = {
  BKASH: { label: 'bKash', tone: 'info' },
  NAGAD: { label: 'Nagad', tone: 'warning' },
  ROCKET: { label: 'Rocket', tone: 'neutral' },
  CAMPUS_WALLET: { label: 'Wallet', tone: 'success' },
};

// --- Withdrawal + Refund ---------------------------------------------------

const WITHDRAWAL_STATUS: ToneMap<string> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
};

const REFUND_STATUS: ToneMap<string> = {
  PENDING: { label: 'Pending', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  REJECTED: { label: 'Rejected', tone: 'danger' },
  RESOLVED: { label: 'Resolved', tone: 'success' },
};

const DOMAINS = {
  request: REQUEST_STATUS,
  payment: PAYMENT_METHOD,
  withdrawal: WITHDRAWAL_STATUS,
  refund: REFUND_STATUS,
} as const;

export type StatusDomain = keyof typeof DOMAINS;

export interface StatusBadgeProps<S extends string> {
  status: S;
  domain: StatusDomain;
  /** Optional override label; useful when a domain has a context-specific name. */
  label?: string;
}

export function StatusBadge<S extends string>({ status, domain, label }: StatusBadgeProps<S>) {
  const map = DOMAINS[domain] as ToneMap<string>;
  const meta = map[status] ?? { label: status, tone: 'neutral' as BadgeTone };
  return <Badge tone={meta.tone}>{label ?? meta.label}</Badge>;
}
