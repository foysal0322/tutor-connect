'use client';

import { useState, useTransition } from 'react';
import { submitWithdrawalRequest } from './actions';
import FloatingInput from '@/components/ui/FloatingInput';

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
  
  const [mfsType, setMfsType] = useState<'BKASH' | 'NAGAD' | 'ROCKET'>('BKASH');
  const [transferType, setTransferType] = useState<'SEND_MONEY' | 'PAYMENT'>('SEND_MONEY');
  const [amount, setAmount] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount.');
      return;
    }
    if (parseFloat(amount) < 100) {
      setError('Minimum withdrawal amount is 100 BDT.');
      return;
    }
    if (!accountNumber || accountNumber.length !== 11) {
      setError('MFS Account Number must be exactly 11 digits.');
      return;
    }

    if (parseFloat(amount) > balance) {
      setError('Requested amount exceeds available balance.');
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
        const val = parseFloat(amount);
        const fee = val * 0.05;
        const net = val * 0.95;
        
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
        
        setAmount('');
        setAccountNumber('');
      }
    });
  };

  const calculatedFee = amount ? parseFloat(amount) * 0.05 : 0;
  const calculatedNet = amount ? parseFloat(amount) * 0.95 : 0;

  return (
    <div className="flex flex-col gap-6">
      
      {/* Dynamic Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card border-t-4 border-primary">
          <span className="text-sm text-muted font-semibold">Total Completed Earnings</span>
          <h2 className="text-3xl mt-1 text-primary">{totalEarned.toFixed(2)} BDT</h2>
          <p className="mt-2 text-xs text-muted">Accumulated from completed sessions</p>
        </div>
        <div className="card border-t-4 border-accent">
          <span className="text-sm text-muted font-semibold">Total Withdrawn / Pending</span>
          <h2 className="text-3xl mt-1 text-accent">{withdrawn.toFixed(2)} BDT</h2>
          <p className="mt-2 text-xs text-muted">Includes pending request amounts</p>
        </div>
        <div className="card border-t-4 border-success bg-success-light">
          <span className="text-sm text-success-hover font-semibold">Available Balance</span>
          <h2 className="text-3xl mt-1 text-success-hover">{balance.toFixed(2)} BDT</h2>
          <p className="mt-2 text-xs text-success-hover">Amount eligible for instant withdrawal</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger-light text-danger-hover rounded-md font-medium border border-danger-hover">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-success-light text-success-hover rounded-md font-medium border border-success-hover">
          {success}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Withdrawal Request Form Card */}
        <div className="card h-fit lg:col-span-1">
          <h3 className="text-xl mb-2">Request Withdrawal</h3>
          <p className="text-sm text-muted mb-6">
            Submit a withdrawal request to transfer available earnings to your MFS account.
          </p>

          <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-4">
            <FloatingInput
              name="amount"
              type="number"
              min="100"
              step="50"
              required
              label="Withdrawal Amount (Min 100 BDT)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <div className="form-group mb-0">
              <label className="form-label font-bold">MFS Provider</label>
              <div className="grid grid-cols-3 gap-2.5 mt-1.5">
                <button
                  type="button"
                  onClick={() => setMfsType('BKASH')}
                  className={`py-3 px-2 rounded-xl font-bold border-2 transition-all text-sm sm:text-base ${mfsType === 'BKASH' ? 'shadow-md text-white' : 'bg-white hover:shadow-sm'}`}
                  style={{
                    backgroundColor: mfsType === 'BKASH' ? '#E2136E' : 'white',
                    borderColor: mfsType === 'BKASH' ? '#E2136E' : 'var(--border-color)',
                    color: mfsType === 'BKASH' ? 'white' : '#E2136E'
                  }}
                >
                  bKash
                </button>
                <button
                  type="button"
                  onClick={() => setMfsType('NAGAD')}
                  className={`py-3 px-2 rounded-xl font-bold border-2 transition-all text-sm sm:text-base ${mfsType === 'NAGAD' ? 'shadow-md text-white' : 'bg-white hover:shadow-sm'}`}
                  style={{
                    backgroundColor: mfsType === 'NAGAD' ? '#F58220' : 'white',
                    borderColor: mfsType === 'NAGAD' ? '#F58220' : 'var(--border-color)',
                    color: mfsType === 'NAGAD' ? 'white' : '#F58220'
                  }}
                >
                  Nagad
                </button>
                <button
                  type="button"
                  onClick={() => setMfsType('ROCKET')}
                  className={`py-3 px-2 rounded-xl font-bold border-2 transition-all text-sm sm:text-base ${mfsType === 'ROCKET' ? 'shadow-md text-white' : 'bg-white hover:shadow-sm'}`}
                  style={{
                    backgroundColor: mfsType === 'ROCKET' ? '#89288f' : 'white',
                    borderColor: mfsType === 'ROCKET' ? '#89288f' : 'var(--border-color)',
                    color: mfsType === 'ROCKET' ? 'white' : '#89288f'
                  }}
                >
                  Rocket
                </button>
              </div>
            </div>

            <FloatingInput
              name="accountNumber"
              type="text"
              required
              label="MFS Account Number"
              placeholder="e.g. 017XXXXXXXX"
              value={accountNumber}
              maxLength={11}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ''))}
            />

            <div className="form-group mb-0">
              <label className="form-label">Transfer Type</label>
              <select
                value={transferType}
                onChange={(e) => setTransferType(e.target.value as any)}
                className="form-select"
              >
                <option value="SEND_MONEY">Send Money</option>
                <option value="PAYMENT">Payment</option>
              </select>
            </div>

            {/* Breakdown section */}
            {amount && (
              <div className="bg-primary-light p-4 rounded-md border border-primary text-sm text-primary">
                <div className="flex justify-between mb-1">
                  <span>Withdrawal Amount:</span>
                  <span>{parseFloat(amount).toFixed(2)} BDT</span>
                </div>
                <div className="flex justify-between mb-1 text-primary">
                  <span>Platform Fee (10%):</span>
                  <span>-{(parseFloat(amount) * 0.1).toFixed(2)} BDT</span>
                </div>
                <div className="flex justify-between mb-2 text-success-hover font-medium">
                  <span>Promo Discount (50% Off):</span>
                  <span>+{(parseFloat(amount) * 0.05).toFixed(2)} BDT</span>
                </div>
                <div className="border-t border-primary/30 my-2"></div>
                <div className="flex justify-between font-bold text-base">
                  <span>Net Payout:</span>
                  <span>{calculatedNet.toFixed(2)} BDT</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || balance <= 0}
              className="btn-primary w-full justify-center mt-2"
            >
              {isPending ? 'Submitting...' : (balance <= 0 ? 'No balance available' : 'Request Withdrawal')}
            </button>
          </form>
        </div>

        {/* Tables Column */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          
          <div className="card">
            <h3 className="text-xl mb-4">Withdrawal Payout History</h3>
            
            {payouts.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">No withdrawal requests found.</p>
            ) : (
              <div className="data-grid-container max-h-[350px] overflow-y-auto">
                <table className="data-grid hidden.md:table">
                  <thead className="sticky top-0 bg-white">
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
                          <span 
                            style={{ 
                              color: w.mfsType === 'BKASH' ? '#e2136e' : w.mfsType === 'NAGAD' ? '#F58220' : '#89288f',
                              backgroundColor: w.mfsType === 'BKASH' ? '#fdf2f7' : w.mfsType === 'NAGAD' ? '#fff7ed' : '#f9f5fa',
                              border: `1px solid ${w.mfsType === 'BKASH' ? '#e2136e' : w.mfsType === 'NAGAD' ? '#F58220' : '#89288f'}` 
                            }} 
                            className="px-2 py-1 rounded-full text-[0.65rem] font-bold tracking-wider"
                          >
                            {w.mfsType}
                          </span>
                        </td>
                        <td>
                          {w.accountNumber}<br/>
                          <span className="text-xs text-muted">{w.transferType}</span>
                        </td>
                        <td><strong>{w.netAmount.toFixed(2)} BDT</strong></td>
                        <td>
                          <span className={`badge ${w.status === 'PENDING' ? 'badge-info' : (w.status === 'APPROVED' ? 'badge-success' : 'badge-danger')}`}>
                            {w.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile View */}
                <div className="md:hidden flex flex-col gap-4 p-4">
                  {payouts.map(w => (
                    <div key={w.id} className="card p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center border-b border-color pb-2">
                        <span className="font-semibold">{w.amount} BDT</span>
                        <span className={`badge ${w.status === 'PENDING' ? 'badge-info' : (w.status === 'APPROVED' ? 'badge-success' : 'badge-danger')}`}>
                          {w.status}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Net Payout</span>
                        <strong>{w.netAmount.toFixed(2)} BDT</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Provider</span>
                        <span 
                          style={{ 
                            color: w.mfsType === 'BKASH' ? '#e2136e' : w.mfsType === 'NAGAD' ? '#F58220' : '#89288f',
                            backgroundColor: w.mfsType === 'BKASH' ? '#fdf2f7' : w.mfsType === 'NAGAD' ? '#fff7ed' : '#f9f5fa',
                            border: `1px solid ${w.mfsType === 'BKASH' ? '#e2136e' : w.mfsType === 'NAGAD' ? '#F58220' : '#89288f'}` 
                          }} 
                          className="px-2 py-1 rounded-full text-[0.65rem] font-bold tracking-wider"
                        >
                          {w.mfsType}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Account</span>
                        <span>{w.accountNumber}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Earnings / Completed Tuition Sessions */}
          <div className="card">
            <h3 className="text-xl mb-4">Tuition Earnings Log</h3>
            
            {completedRequests.length === 0 ? (
              <p className="text-muted text-sm text-center py-4">No completed sessions found.</p>
            ) : (
              <div className="data-grid-container max-h-[350px] overflow-y-auto">
                <table className="data-grid hidden.md:table">
                  <thead className="sticky top-0 bg-white">
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
                        <td><strong className="text-success-hover">+{r.budget} BDT</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Mobile View */}
                <div className="md:hidden flex flex-col gap-4 p-4">
                  {completedRequests.map(r => (
                    <div key={r.id} className="card p-3 flex flex-col gap-2">
                      <div className="flex justify-between items-center border-b border-color pb-2">
                        <span className="font-semibold">{r.course.name}</span>
                        <strong className="text-success-hover">+{r.budget} BDT</strong>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Student</span>
                        <span>{r.student.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted">Topic</span>
                        <span>{r.topic}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
