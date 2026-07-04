'use client';

import { useState, useTransition } from 'react';
import { submitWithdrawalRequest } from './actions';
import styles from '../../dashboard.module.css';

interface EarningsClientProps {
  completedRequests: any[];
  withdrawalRequests: any[];
  totalEarned: number;
  totalWithdrawn: number;
  availableBalance: number;
}

export default function EarningsClient({
  completedRequests,
  withdrawalRequests,
  totalEarned,
  totalWithdrawn,
  availableBalance: initialAvailableBalance
}: EarningsClientProps) {
  const [balance, setBalance] = useState(initialAvailableBalance);
  const [withdrawn, setWithdrawn] = useState(totalWithdrawn);
  const [payouts, setPayouts] = useState(withdrawalRequests);
  
  // Withdrawal Form States
  const [mfsType, setMfsType] = useState<'BKASH' | 'NAGAD' | 'ROCKET'>('BKASH');
  const [transferType, setTransferType] = useState<'SEND_MONEY' | 'PAYMENT'>('SEND_MONEY');
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    if (val > balance) {
      setError('Requested amount exceeds available balance.');
      return;
    }

    if (!accountNumber) {
      setError('Please provide an MFS account number.');
      return;
    }

    const formData = new FormData();
    formData.append('amount', amount);
    formData.append('mfsType', mfsType);
    formData.append('accountNumber', accountNumber);
    formData.append('transferType', transferType);

    startTransition(async () => {
      const res = await submitWithdrawalRequest(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSuccess('Withdrawal request submitted successfully! Admin verification pending.');
        const fee = val * 0.05;
        const net = val * 0.95;
        
        // Add to local state list
        const newRequest = {
          id: `temp-${Date.now()}`,
          amount: val,
          platformFee: fee,
          netAmount: net,
          mfsType,
          accountNumber,
          transferType,
          status: 'PENDING',
          createdAt: new Date()
        };

        setPayouts(prev => [newRequest, ...prev]);
        setBalance(prev => prev - val);
        setWithdrawn(prev => prev + val);
        
        // Reset form
        setAmount('');
        setAccountNumber('');
      }
    });
  };

  const getMfsColor = (type: string) => {
    if (type === 'BKASH') return '#d1417a';
    if (type === 'NAGAD') return '#f67221';
    return '#8c2a8c';
  };

  const calculatedFee = amount ? parseFloat(amount) * 0.05 : 0;
  const calculatedNet = amount ? parseFloat(amount) * 0.95 : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Dynamic Widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        <div className={styles.card} style={{ borderTop: '5px solid var(--primary)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Completed Earnings</span>
          <h2 style={{ fontSize: '2rem', margin: '0.25rem 0 0 0', color: 'var(--text-main)' }}>{totalEarned.toFixed(2)} BDT</h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Accumulated from completed sessions</p>
        </div>
        <div className={styles.card} style={{ borderTop: '5px solid #a855f7' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Withdrawn / Pending</span>
          <h2 style={{ fontSize: '2rem', margin: '0.25rem 0 0 0', color: 'var(--text-main)' }}>{withdrawn.toFixed(2)} BDT</h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Includes pending request amounts</p>
        </div>
        <div className={styles.card} style={{ borderTop: '5px solid var(--success)', background: '#f0fdf4' }}>
          <span style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: 600 }}>Available Balance</span>
          <h2 style={{ fontSize: '2rem', margin: '0.25rem 0 0 0', color: '#166534' }}>{balance.toFixed(2)} BDT</h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#166534' }}>Amount eligible for instant withdrawal</p>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '1rem', borderRadius: '8px', border: '1px solid #fca5a5' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '1rem', borderRadius: '8px', border: '1px solid #6ee7b7' }}>
          {success}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
        
        {/* Withdrawal Request Form Card */}
        <div className={styles.card} style={{ height: 'fit-content' }}>
          <h3 style={{ marginTop: 0, fontSize: '1.25rem' }}>Request Withdrawal</h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
            Submit a withdrawal request to transfer available earnings to your MFS account.
          </p>

          <form onSubmit={handleWithdrawSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Amount */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Withdrawal Amount (BDT)</label>
              <input
                type="number"
                required
                min="100"
                step="50"
                placeholder="Minimum 100 BDT"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>

            {/* MFS Providers */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>MFS Provider</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setMfsType('BKASH')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: mfsType === 'BKASH' ? '2px solid #d1417a' : '1px solid var(--border-color)',
                    background: mfsType === 'BKASH' ? '#fdf2f7' : 'white',
                    color: mfsType === 'BKASH' ? '#d1417a' : 'var(--text-main)',
                    fontWeight: 600
                  }}
                >
                  bKash
                </button>
                <button
                  type="button"
                  onClick={() => setMfsType('NAGAD')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: mfsType === 'NAGAD' ? '2px solid #f67221' : '1px solid var(--border-color)',
                    background: mfsType === 'NAGAD' ? '#fff7ed' : 'white',
                    color: mfsType === 'NAGAD' ? '#f67221' : 'var(--text-main)',
                    fontWeight: 600
                  }}
                >
                  Nagad
                </button>
                <button
                  type="button"
                  onClick={() => setMfsType('ROCKET')}
                  style={{
                    padding: '0.6rem',
                    borderRadius: '8px',
                    border: mfsType === 'ROCKET' ? '2px solid #8c2a8c' : '1px solid var(--border-color)',
                    background: mfsType === 'ROCKET' ? '#faf5ff' : 'white',
                    color: mfsType === 'ROCKET' ? '#8c2a8c' : 'var(--text-main)',
                    fontWeight: 600
                  }}
                >
                  Rocket
                </button>
              </div>
            </div>

            {/* Account Number */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>MFS Account Number</label>
              <input
                type="text"
                required
                placeholder="e.g. 017XXXXXXXX"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}
              />
            </div>

            {/* Transfer Type */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: 600 }}>Transfer Type</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as any)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'white' }}
              >
                <option value="SEND_MONEY">Send Money</option>
                <option value="PAYMENT">Payment</option>
              </select>
            </div>

            {/* Breakdown section */}
            {amount && (
              <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.4rem 0' }}>
                  <span>Withdrawal Amount:</span>
                  <span>{parseFloat(amount).toFixed(2)} BDT</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.4rem 0', color: 'var(--text-muted)' }}>
                  <span>Platform Fee (10%):</span>
                  <span>-{(parseFloat(amount) * 0.1).toFixed(2)} BDT</span>
                </p>
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: '0 0 0.4rem 0', color: 'var(--success)' }}>
                  <span>Promo Discount (50% Off):</span>
                  <span>+{(parseFloat(amount) * 0.05).toFixed(2)} BDT</span>
                </p>
                <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '0.5rem 0' }} />
                <p style={{ display: 'flex', justifyContent: 'space-between', margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary)' }}>
                  <span>Net Payout (deducting 5% fee):</span>
                  <span>{calculatedNet.toFixed(2)} BDT</span>
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || balance <= 0}
              className="btn-primary"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', display: 'flex', justifyContent: 'center' }}
            >
              {isPending ? 'Submitting...' : (balance <= 0 ? 'No balance available' : 'Request Withdrawal')}
            </button>
          </form>
        </div>

        {/* Withdrawal Payout History Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          <div className={styles.card}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Withdrawal Payout History</h3>
            
            {payouts.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No withdrawal requests found.</p>
            ) : (
              <div className={styles.tableResponsive} style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Account</th>
                      <th>Net Payout</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payouts.map((w) => (
                      <tr key={w.id}>
                        <td>{w.amount} BDT</td>
                        <td>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: getMfsColor(w.mfsType) }}>
                            {w.mfsType}
                          </span>
                        </td>
                        <td>{w.accountNumber}<br/><span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{w.transferType}</span></td>
                        <td><strong>{w.netAmount.toFixed(2)} BDT</strong></td>
                        <td>
                          <span style={{
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: w.status === 'PENDING' ? '#e0e7ff' : (w.status === 'APPROVED' ? '#d1fae5' : '#fee2e2'),
                            color: w.status === 'PENDING' ? '#4f46e5' : (w.status === 'APPROVED' ? '#047857' : '#ef4444')
                          }}>
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Earnings / Completed Tuition Sessions */}
          <div className={styles.card}>
            <h3 style={{ marginTop: 0, fontSize: '1.25rem', marginBottom: '1rem' }}>Tuition Earnings Log</h3>
            
            {completedRequests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No completed sessions found.</p>
            ) : (
              <div className={styles.tableResponsive} style={{ maxHeight: '350px', overflowY: 'auto' }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Course</th>
                      <th>Topic</th>
                      <th>Earning</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRequests.map((r) => (
                      <tr key={r.id}>
                        <td><strong>{r.student.name}</strong></td>
                        <td>{r.course.name}</td>
                        <td>{r.topic}</td>
                        <td><strong style={{ color: 'var(--success)' }}>+{r.budget} BDT</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
      
    </div>
  );
}
