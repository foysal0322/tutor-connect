import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';

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

  return (
    <div className="max-w-full">
      <h1 className="mb-2">Payment History</h1>
      <p className="text-muted mb-6">
        Track your submitted payments for tutor match requests and check their manual verification status.
      </p>

      {requests.length === 0 ? (
        <div className="card text-center p-8 text-muted">
          No payment history found.
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
