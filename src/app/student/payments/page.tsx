import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import styles from '../../dashboard.module.css';

export default async function StudentPaymentsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== 'STUDENT') {
    redirect('/auth/student-signin?callbackUrl=/student/payments');
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
    <div className="animate-fade-in">
      <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '1.5rem' }}>Payment History</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
        Track your submitted payments for tutor match requests and check their manual verification status.
      </p>

      <div className={styles.card}>
        {requests.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
            No payment history found.
          </p>
        ) : (
          <div className={styles.tableResponsive}>
            <table className={styles.table}>
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
                        <span style={{ 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          backgroundColor: req.payment.mfsType === 'BKASH' ? '#fdf2f7' : (req.payment.mfsType === 'NAGAD' ? '#fff7ed' : '#faf5ff'),
                          color: req.payment.mfsType === 'BKASH' ? '#d1417a' : (req.payment.mfsType === 'NAGAD' ? '#f67221' : '#8c2a8c')
                        }}>
                          {req.payment.mfsType}
                        </span>
                      </td>
                      <td>{req.payment.accountNumber}</td>
                      <td><code style={{ background: 'var(--bg-color)', padding: '0.1rem 0.3rem', borderRadius: '4px' }}>{req.payment.transactionId}</code></td>
                      <td>{new Date(req.payment.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span style={{ 
                          padding: '0.25rem 0.6rem', 
                          borderRadius: '4px', 
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          backgroundColor: isVerified ? '#d1fae5' : '#e0e7ff',
                          color: isVerified ? '#047857' : '#4f46e5'
                        }}>
                          {isVerified ? 'VERIFIED' : 'PENDING VERIFICATION'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
