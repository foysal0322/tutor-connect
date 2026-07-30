import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { Wallet, Clock, CheckCircle2, ReceiptText, ArrowUpRight } from 'lucide-react';
import { formatBDT } from '@/lib/format';
import PendingPaymentsSection from './PendingPaymentsSection';
import s from './payments.module.css';

export default async function StudentPaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role === 'ADMIN') {
    redirect('/auth/signin?callbackUrl=/student/payments');
  }

  const studentId = (session.user as any).id;

  const requests = await prisma.tutorRequest.findMany({
    where: {
      studentId,
      payment: { isNot: null }
    },
    include: {
      course: true,
      payment: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // Requests awaiting payment (tutor matched, not yet paid) shown in the
  // Pending Payments section above the history table.
  const pendingRequests = await prisma.tutorRequest.findMany({
    where: {
      studentId,
      status: 'MATCHED',
    },
    include: {
      course: true,
      assignedTutor: { include: { department: { select: { name: true } } } },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: studentId },
    select: { balance: true },
  });
  const userBalance = user?.balance ?? 0;

  // Summary figures for the hero + KPI row. Same verification rule as the
  // history table below (status not PAYMENT_PENDING / MATCHED = verified).
  const totalPayable = pendingRequests.reduce((sum, r) => sum + r.budget * 1.05, 0);
  const totalPaid = requests.reduce((sum, r) => sum + (r.payment?.amount ?? 0), 0);
  const verifiedCount = requests.filter(
    (r) => r.status !== 'PAYMENT_PENDING' && r.status !== 'MATCHED'
  ).length;

  return (
    <div className="max-w-full">
      <h1 className="mb-1 text-2xl">Payments</h1>
      <p className="text-muted mb-4">
        Complete pending payments for your matched tutors and track your submitted payment history.
      </p>

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
      <div className={`${s.kpiRow} mb-5`}>
        <div className={`card ${s.kpiCard}`}>
          <div className={s.kpiLabel}>
            <Clock size={14} aria-hidden="true" /> Awaiting Payment
          </div>
          <div className={s.kpiValue}>{pendingRequests.length}</div>
          <div className={s.kpiSub}>
            {pendingRequests.length > 0
              ? `${formatBDT(totalPayable)} BDT due now`
              : 'Nothing due right now'}
          </div>
        </div>
        <div className={`card ${s.kpiCard}`}>
          <div className={s.kpiLabel}>
            <ArrowUpRight size={14} aria-hidden="true" /> Total Paid
          </div>
          <div className={s.kpiValue}>{formatBDT(totalPaid)} <span className={s.currency}>BDT</span></div>
          <div className={s.kpiSub}>
            Across {requests.length} payment{requests.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className={`card ${s.kpiCard}`}>
          <div className={s.kpiLabel}>
            <CheckCircle2 size={14} aria-hidden="true" /> Verified Sessions
          </div>
          <div className={s.kpiValue}>{verifiedCount}</div>
          <div className={s.kpiSub}>of {requests.length} submitted</div>
        </div>
      </div>

      <PendingPaymentsSection initialPending={pendingRequests} userBalance={userBalance} />

      <h2 className="mb-3">Payment History</h2>
      {requests.length === 0 ? (
        <div className={`card ${s.emptyState}`}>
          <ReceiptText size={36} aria-hidden="true" />
          <p className={s.emptyTitle}>No payment history yet</p>
          <p className={s.emptySub}>
            Your submitted payments will appear here once they are verified.
          </p>
        </div>
      ) : (
        <div className="data-grid-container">
          <table className="data-grid hidden md:table">
            <thead>
              <tr>
                <th>Course</th>
                <th>Tuition Fee</th>
                <th>Total Paid (with 5% fee)</th>
                <th>MFS Provider</th>
                <th>MFS Account</th>
                <th>Transaction ID</th>
                <th>Payment Date</th>
                <th>Verification Status</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                if (!req.payment) return null;

                // Verification status is determined by request status
                const isVerified = req.status !== 'PAYMENT_PENDING' && req.status !== 'MATCHED';

                return (
                  <tr key={req.id}>
                    <td><strong>{req.course.name}</strong></td>
                    <td>{req.budget} BDT</td>
                    <td><strong>{req.payment.amount} BDT</strong></td>
                    <td>
                      <span className={`badge ${req.payment.mfsType === 'BKASH' ? 'badge-danger' : (req.payment.mfsType === 'NAGAD' ? 'badge-warning' : 'badge-info')}`}>
                        {req.payment.mfsType}
                      </span>
                    </td>
                    <td>{req.payment.accountNumber}</td>
                    <td><code className="bg-white border border-color px-2 py-1 rounded text-xs font-mono">{req.payment.transactionId}</code></td>
                    <td>{new Date(req.payment.createdAt).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${isVerified ? 'badge-success' : 'badge-info'}`}>
                        {isVerified ? 'VERIFIED' : 'PENDING VERIFICATION'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile Card View */}
          <div className="md:hidden flex flex-col gap-4 p-4">
            {requests.map(req => {
              if (!req.payment) return null;
              const isVerified = req.status !== 'PAYMENT_PENDING' && req.status !== 'MATCHED';

              return (
                <div key={req.id} className="card p-4 flex flex-col gap-2">
                  <div className="flex justify-between items-center border-b border-color pb-2">
                    <span className="font-semibold">{req.course.name}</span>
                    <span className={`badge ${isVerified ? 'badge-success' : 'badge-info'}`}>
                      {isVerified ? 'VERIFIED' : 'PENDING'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Total Paid</span>
                    <strong>{req.payment.amount} BDT</strong>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Provider</span>
                    <span>{req.payment.mfsType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Txn ID</span>
                    <code className="text-xs">{req.payment.transactionId}</code>
                  </div>
                  <div className="flex justify-between text-sm text-muted">
                    <span>Date</span>
                    <span>{new Date(req.payment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
