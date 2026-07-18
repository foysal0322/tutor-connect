'use client';

import { useState, useMemo } from 'react';
import { verifyWithdrawalRequest } from './actions';

interface WithdrawalManagerProps {
  initialRequests: any[];
}

export default function WithdrawalManager({ initialRequests }: WithdrawalManagerProps) {
  const [requests, setRequests] = useState(initialRequests);
  const [statusFilter, setStatusFilter] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (statusFilter) {
      result = result.filter(w => w.status === statusFilter);
    }
    // Sort PENDING on top, then by date descending
    result.sort((a, b) => {
      if (a.status === 'PENDING' && b.status !== 'PENDING') return -1;
      if (a.status !== 'PENDING' && b.status === 'PENDING') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return result;
  }, [requests, statusFilter]);

  const handleVerify = async (id: string, approve: boolean) => {
    const actionName = approve ? 'approve' : 'reject';
    if (!confirm(`Are you sure you want to ${actionName} this withdrawal request?`)) return;

    setLoadingId(id);
    const res = await verifyWithdrawalRequest(id, approve);
    if (res?.error) {
      alert(res.error);
    } else {
      setRequests(prev => prev.map(w => w.id === id ? { ...w, status: approve ? 'APPROVED' : 'REJECTED' } : w));
    }
    setLoadingId(null);
  };

  const getMfsColor = (type: string) => {
    if (type === 'BKASH') return '#d1417a';
    if (type === 'NAGAD') return '#f67221';
    return '#8c2a8c';
  };

  return (
    <div className="card p-0 overflow-hidden">
      <div className="flex flex-col sm:flex-row gap-4 p-4 border-b border-color bg-gray-50/50">
        <div className="w-full sm:w-64 ml-auto">
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="form-select h-[42px]"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      <div className="data-grid-container">
        <table className="data-grid hidden.md:table">
          <thead>
            <tr>
              <th>Tutor</th>
              <th>Requested Amount</th>
              <th>Platform Fee (5%)</th>
              <th>Net Payout (95%)</th>
              <th>MFS Method & Account</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRequests.length > 0 ? (
              filteredRequests.map(w => (
                <tr key={w.id}>
                  <td>
                    <div className="font-semibold text-main">{w.tutor.name}</div>
                    <div className="text-xs text-muted mt-1">Email: {w.tutor.email}</div>
                  </td>
                  <td>{w.amount.toFixed(2)} BDT</td>
                  <td>{w.platformFee.toFixed(2)} BDT</td>
                  <td className="font-semibold text-primary">{w.netAmount.toFixed(2)} BDT</td>
                  <td>
                    <div className="text-sm font-bold" style={{ color: getMfsColor(w.mfsType) }}>
                      {w.mfsType}
                    </div>
                    <div className="font-medium text-main">{w.accountNumber}</div>
                    <div className="text-xs text-muted mt-1">Type: {w.transferType}</div>
                  </td>
                  <td>{new Date(w.createdAt).toLocaleDateString()}</td>
                  <td>
                    <span className={`badge ${w.status === 'PENDING' ? 'badge-primary' : (w.status === 'APPROVED' ? 'badge-success' : 'badge-danger')}`}>
                      {w.status}
                    </span>
                  </td>
                  <td>
                    {w.status === 'PENDING' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleVerify(w.id, true)}
                          disabled={loadingId === w.id}
                          className="btn bg-success text-white hover:bg-success-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleVerify(w.id, false)}
                          disabled={loadingId === w.id}
                          className="btn bg-danger text-white hover:bg-danger-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-muted text-sm italic">Processed</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="text-center py-8 text-muted">
                  No withdrawal requests found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        
        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50">
          {filteredRequests.length > 0 ? (
            filteredRequests.map(w => (
              <div key={w.id} className="card p-4 flex flex-col gap-3">
                <div className="flex justify-between items-start border-b border-color pb-3">
                  <div>
                    <div className="font-semibold text-main text-lg">{w.tutor.name}</div>
                    <div className="text-sm text-muted">{w.tutor.email}</div>
                  </div>
                  <span className={`badge ${w.status === 'PENDING' ? 'badge-primary' : (w.status === 'APPROVED' ? 'badge-success' : 'badge-danger')}`}>
                    {w.status}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm bg-gray-50 p-2 rounded">
                  <div>
                    <div className="text-muted text-xs">MFS Type</div>
                    <div className="font-bold" style={{ color: getMfsColor(w.mfsType) }}>{w.mfsType}</div>
                  </div>
                  <div>
                    <div className="text-muted text-xs">Account</div>
                    <div className="font-medium">{w.accountNumber} ({w.transferType})</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm mt-1">
                  <div>
                    <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Requested</div>
                    <div className="font-medium text-main">{w.amount.toFixed(2)} BDT</div>
                  </div>
                  <div>
                    <div className="text-muted text-xs uppercase font-bold tracking-wider mb-1">Net Payout</div>
                    <div className="font-bold text-primary">{w.netAmount.toFixed(2)} BDT</div>
                  </div>
                </div>
                
                <div className="text-xs text-muted text-right mt-1">
                  Requested on {new Date(w.createdAt).toLocaleDateString()}
                </div>
                
                {w.status === 'PENDING' && (
                  <div className="mt-2 pt-3 border-t border-color flex gap-2">
                    <button
                      onClick={() => handleVerify(w.id, true)}
                      disabled={loadingId === w.id}
                      className="btn bg-success text-white hover:bg-success-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-1"
                    >
                      {loadingId === w.id ? '...' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleVerify(w.id, false)}
                      disabled={loadingId === w.id}
                      className="btn bg-danger text-white hover:bg-danger-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex-1"
                    >
                      {loadingId === w.id ? '...' : 'Reject'}
                    </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted">
              No withdrawal requests found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
