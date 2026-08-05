'use client';

import { Wallet, Clock, TrendingUp } from 'lucide-react';
import { formatBDT } from '@/lib/format';
import Tabs from '@/components/ui/Tabs';
import { KPI } from '@/components/ui/KPI';

/**
 * Unified "Money" hub. Replaces the three separate sidebar entries
 * (Payments / Earnings & Withdrawals / My Wallet) with a single page that
 * surfaces the most important balance at the top and lets the member switch
 * between the three perspectives via tabs.
 *
 * Server-side data fetching lives in /wallet/page.tsx; this component just
 * renders the pre-fetched panels and wires up the Tabs primitive. The default
 * active tab is chosen by the Tabs component from the highest `count`, so a
 * member with pending payments lands on Payments, while a tutor with no
 * payments due but active earnings lands on Earnings.
 *
 * Phase 4: bespoke hero KPI cards replaced with the shared <KPI> primitive.
 */
export default function WalletHub({
  userName,
  walletBalance,
  paymentsDueCount,
  paymentsDueTotal,
  earningsAvailable,
  walletPanel,
  paymentsPanel,
  earningsPanel,
}: {
  userName?: string;
  walletBalance: number;
  paymentsDueCount: number;
  paymentsDueTotal: number;
  earningsAvailable: number;
  walletPanel: React.ReactNode;
  paymentsPanel: React.ReactNode;
  earningsPanel: React.ReactNode;
}) {
  const tabs = [
    { id: 'wallet', label: 'Wallet', count: undefined },
    { id: 'payments', label: 'Payments', count: paymentsDueCount || undefined },
    { id: 'earnings', label: 'Earnings', count: undefined },
  ];

  const panels: Record<string, React.ReactNode> = {
    wallet: walletPanel,
    payments: paymentsPanel,
    earnings: earningsPanel,
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-2">
      <header className="mb-6">
        <h1 className="mb-1 text-2xl">
          {userName ? `${userName.split(' ')[0]}'s ` : ''}Money
        </h1>
        <p className="text-muted">
          Your campus wallet, payments, and teaching earnings — all in one place.
        </p>
      </header>

      {/* ---------- KPI hero row ---------- */}
      <div
        className="mb-6"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <KPI
          label="Wallet Balance"
          value={`${formatBDT(walletBalance)}`}
          icon={<Wallet size={14} />}
          tone="primary"
          variant="accent"
          hint="Available for tuition payments"
        />
        <KPI
          label="Payments Due"
          value={paymentsDueCount}
          icon={<Clock size={14} />}
          tone="danger"
          hint={
            paymentsDueCount > 0
              ? `${formatBDT(paymentsDueTotal)} BDT due now`
              : 'Nothing due right now'
          }
        />
        <KPI
          label="Available to Withdraw"
          value={formatBDT(earningsAvailable)}
          icon={<TrendingUp size={14} />}
          tone="success"
          hint="From completed tutoring sessions"
        />
      </div>

      <Tabs tabs={tabs} panels={panels} />
    </div>
  );
}
