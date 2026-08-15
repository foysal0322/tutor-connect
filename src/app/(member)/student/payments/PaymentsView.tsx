'use client';

import { Wallet, Clock, CheckCircle2, ReceiptText, ArrowUpRight } from 'lucide-react';
import { formatBDT } from '@/lib/format';
import { KPI } from '@/components/ui/KPI';
import DataGrid, { type ColumnDef } from '@/components/ui/DataGrid';
import PendingPaymentsSection from './PendingPaymentsSection';
import s from './payments.module.css';

/**
 * Reusable render of the student Payments view (balance hero + KPIs +
 * pending payments + history table). Extracted from /student/payments/page.tsx
 * so the unified /wallet hub can embed the same UI inside its Payments tab.
 *
 * Client component — receives already-fetched rows and renders them. Needs
 * `'use client'` because the DataGrid `columns` carry `cell` render functions
 * and a `getRowId` callback, neither of which can cross the RSC boundary.
 *
 * Phase 4: bespoke KPI cards → shared <KPI>; bespoke history table → <DataGrid>.
 */
export default function PaymentsView({
  requests,
  pendingRequests,
  userBalance,
}: {
  requests: any[];
  pendingRequests: any[];
  userBalance: number;
}) {
  // Summary figures for the hero + KPI row. Same verification rule as the
  // history table below (status not PAYMENT_PENDING / MATCHED = verified).
  const totalPayable = pendingRequests.reduce((sum, r) => sum + r.budget * 1.05, 0);
  const totalPaid = requests.reduce((sum, r) => sum + (r.payment?.amount ?? 0), 0);
  const verifiedCount = requests.filter(
    (r) => r.status !== 'PAYMENT_PENDING' && r.status !== 'MATCHED',
  ).length;

  // Only rows with a payment record go into the history DataGrid.
  const paidRequests = requests.filter((r) => r.payment);

  const columns: ColumnDef<any>[] = [
    {
      header: 'Course',
      accessorKey: 'course.name',
      sortable: true,
      cell: (r) => <strong>{r.course.name}</strong>,
    },
    {
      header: 'Tuition Fee',
      accessorKey: 'budget',
      sortable: true,
      cell: (r) => `${r.budget} BDT`,
    },
    {
      header: 'Total Paid',
      accessorKey: 'payment.amount',
      sortable: true,
      cell: (r) => <strong>{r.payment.amount} BDT</strong>,
    },
    {
      header: 'Provider',
      accessorKey: 'payment.mfsType',
      cell: (r) => (
        <span
          className={`badge ${
            r.payment.mfsType === 'BKASH'
              ? 'badge-danger'
              : r.payment.mfsType === 'NAGAD'
                ? 'badge-warning'
                : 'badge-info'
          }`}
        >
          {r.payment.mfsType}
        </span>
      ),
    },
    {
      header: 'Account Number',
      accessorKey: 'payment.accountNumber',
      cell: (r) => r.payment.accountNumber,
    },
    {
      header: 'Transaction ID',
      accessorKey: 'payment.transactionId',
      cell: (r) => (
        <code className="bg-white border border-color px-2 py-1 rounded text-xs font-mono">
          {r.payment.transactionId}
        </code>
      ),
    },
    {
      header: 'Date',
      accessorKey: 'payment.createdAt',
      sortable: true,
      cell: (r) =>
        new Date(r.payment.createdAt).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          timeZone: 'Asia/Dhaka',
        }),
    },
    {
      header: 'Status',
      id: 'status',
      cell: (r) => {
        const isVerified = r.status !== 'PAYMENT_PENDING' && r.status !== 'MATCHED';
        return (
          <span className={`badge ${isVerified ? 'badge-success' : 'badge-info'}`}>
            {isVerified ? 'VERIFIED' : 'PENDING VERIFICATION'}
          </span>
        );
      },
    },
  ];

  return (
    <div className="w-full">
      {/* ---------- Balance hero ---------- */}
      <section className={`${s.balanceHero} mb-6`}>
        <div className={s.balanceMain}>
          <span className={s.balanceLabel}>Available Balance</span>
          <div className={s.balanceValue}>
            <span>{formatBDT(userBalance)}</span>
            <span className={s.currency}>BDT</span>
          </div>
          <p className={s.balanceHint}>
            Pay matched tutors instantly from your Campus Wallet, or submit a manual MFS payment for verification.
          </p>
        </div>
        <div className={s.balanceTile}>
          <Wallet size={32} aria-hidden="true" />
        </div>
      </section>

      {/* ---------- KPI summary ---------- */}
      <div
        className="mb-5"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <KPI
          label="Awaiting Payment"
          value={pendingRequests.length}
          icon={<Clock size={14} />}
          tone="danger"
          hint={
            pendingRequests.length > 0
              ? `${formatBDT(totalPayable)} BDT due now`
              : 'Nothing due right now'
          }
        />
        <KPI
          label="Total Paid"
          value={`${formatBDT(totalPaid)}`}
          icon={<ArrowUpRight size={14} />}
          tone="primary"
          hint={`Across ${requests.length} payment${requests.length === 1 ? '' : 's'}`}
        />
        <KPI
          label="Verified Sessions"
          value={verifiedCount}
          icon={<CheckCircle2 size={14} />}
          tone="success"
          hint={`of ${requests.length} submitted`}
        />
      </div>

      <PendingPaymentsSection initialPending={pendingRequests} userBalance={userBalance} />

      <h2 className="mb-3">Payment History</h2>
      {paidRequests.length === 0 ? (
        <div className={`card ${s.emptyState}`}>
          <ReceiptText size={36} aria-hidden="true" />
          <p className={s.emptyTitle}>No payment history yet</p>
          <p className={s.emptySub}>
            Your submitted payments will appear here once they are verified.
          </p>
        </div>
      ) : (
        <DataGrid
          data={paidRequests}
          columns={columns}
          getRowId={(r) => r.id}
          searchable
          searchKeys={['course.name', 'payment.mfsType', 'payment.transactionId']}
          itemsPerPage={10}
          emptyMessage="No payments found."
        />
      )}
    </div>
  );
}
