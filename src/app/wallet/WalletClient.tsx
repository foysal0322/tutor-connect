'use client';

import { useState } from 'react';
import { rechargeWallet } from './actions';
import FloatingInput from '@/components/ui/FloatingInput';
import Spinner from '@/components/Spinner';
import { CreditCard, DollarSign, ArrowUpRight, ArrowDownLeft, History, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function WalletClient({ initialBalance, initialTransactions }: { initialBalance: number, initialTransactions: any[] }) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [activeTab, setActiveTab] = useState<'recharge' | 'history'>('recharge');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mfsType, setMfsType] = useState('DEMO_INSTANT');

  async function handleRecharge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setLoading(true);
    setError('');
    setSuccessMsg('');

    const formData = new FormData(form);
    formData.set('mfsType', mfsType === 'DEMO_INSTANT' ? 'Instant Test Recharge' : mfsType);

    const res = await rechargeWallet(formData);
    if (res?.error) {
      setError(res.error);
    } else if (res?.success && res.newBalance !== undefined) {
      const addedAmount = parseFloat(formData.get('amount') as string);
      setBalance(res.newBalance);
      setSuccessMsg(`Successfully recharged ${addedAmount} BDT! Your new balance is ${res.newBalance} BDT.`);
      
      // Prepend new transaction to UI list
      const newTxn = {
        id: `temp-${Date.now()}`,
        amount: addedAmount,
        type: 'RECHARGE',
        description: `Wallet recharge via ${mfsType === 'DEMO_INSTANT' ? 'Instant Test Recharge' : mfsType}`,
        referenceId: formData.get('transactionId') || 'DEMO-TXN',
        createdAt: new Date().toISOString()
      };
      setTransactions(prev => [newTxn, ...prev]);
      form?.reset();
    }
    setLoading(false);
  }

  const getTxnIconAndColor = (type: string) => {
    switch (type) {
      case 'RECHARGE':
        return { icon: <ArrowDownLeft className="text-success" size={20} />, bg: 'bg-success-light', label: 'Recharge', sign: '+' };
      case 'EARNING_CREDIT':
        return { icon: <ArrowDownLeft className="text-primary" size={20} />, bg: 'bg-primary-light', label: 'Earning', sign: '+' };
      case 'TUITION_PAYMENT':
        return { icon: <ArrowUpRight className="text-danger-hover" size={20} />, bg: 'bg-danger-light', label: 'Payment', sign: '-' };
      case 'WITHDRAWAL':
        return { icon: <ArrowUpRight className="text-purple-600" size={20} />, bg: 'bg-purple-100', label: 'Withdrawal', sign: '-' };
      default:
        return { icon: <DollarSign className="text-muted" size={20} />, bg: 'bg-gray-100', label: type, sign: '' };
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl">
      {/* Wallet Balance Card */}
      <div className="card p-6 md:p-8 bg-gradient-to-r from-primary to-primary-hover text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
          <DollarSign size={220} />
        </div>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10">
          <div>
            <span className="text-sm font-medium uppercase tracking-wider text-primary-light">Available Wallet Balance</span>
            <div className="text-4xl md:text-5xl font-extrabold mt-1 tracking-tight flex items-baseline gap-2">
              {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              <span className="text-2xl font-semibold">BDT</span>
            </div>
            <p className="text-xs text-primary-light/80 mt-2">
              Use your wallet balance for 1-click tuition payments or withdraw your teaching earnings.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setActiveTab('recharge')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md ${activeTab === 'recharge' ? 'bg-white text-primary' : 'bg-primary-dark/40 text-white hover:bg-primary-dark/60'}`}
            >
              <PlusCircle size={18} /> Recharge
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-5 py-2.5 rounded-lg font-semibold transition-all flex items-center gap-2 shadow-md ${activeTab === 'history' ? 'bg-white text-primary' : 'bg-primary-dark/40 text-white hover:bg-primary-dark/60'}`}
            >
              <History size={18} /> History
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Content */}
      {activeTab === 'recharge' && (
        <div className="card p-6 sm:p-8 shadow-md border-t-4 border-t-primary animate-fade-in">
          <h3 className="text-xl font-bold text-main mb-2 flex items-center gap-2">
            <PlusCircle className="text-primary" size={22} /> Recharge Your Wallet
          </h3>
          <p className="text-muted text-sm mb-6">
            Add funds instantly to your campus wallet. For testing or quick checkout, choose "Instant Demo Recharge".
          </p>

          {error && <div className="p-4 bg-danger-light text-danger-hover rounded-md font-medium text-sm mb-6 border border-danger-hover">{error}</div>}
          {successMsg && <div className="p-4 bg-success-light text-success-hover rounded-md font-medium text-sm mb-6 border border-success flex items-center gap-2"><CheckCircle2 size={18} /> {successMsg}</div>}

          <form onSubmit={handleRecharge} className="flex flex-col gap-5">
            <div className="form-group mb-0">
              <label className="form-label text-sm font-semibold mb-2">Select Payment Method</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'DEMO_INSTANT', name: '⚡ Instant Demo', desc: 'Auto-credit test' },
                  { id: 'bKash', name: '📱 bKash', desc: 'Personal / Merchant' },
                  { id: 'Nagad', name: '📱 Nagad', desc: 'Personal / Merchant' },
                  { id: 'Rocket', name: '🚀 Rocket', desc: 'DBBL Mobile' }
                ].map((method) => (
                  <div
                    key={method.id}
                    onClick={() => setMfsType(method.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all flex flex-col items-center text-center ${mfsType === method.id ? 'border-primary bg-primary-light/30 shadow-md font-semibold' : 'border-color hover:border-primary/50'}`}
                  >
                    <span className="text-sm font-bold text-main">{method.name}</span>
                    <span className="text-[0.65rem] text-muted mt-1">{method.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <FloatingInput
              name="amount"
              type="number"
              step="any"
              min="50"
              required
              label="Recharge Amount (BDT)"
              placeholder="e.g. 500 or 1000"
            />

            {mfsType !== 'DEMO_INSTANT' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fade-in">
                <FloatingInput
                  name="accountNumber"
                  type="text"
                  required
                  label="Your MFS Account Number"
                  placeholder="e.g. 017XXXXXXXX"
                />
                <FloatingInput
                  name="transactionId"
                  type="text"
                  required
                  label="Transaction ID (TrxID)"
                  placeholder="e.g. 9J8H7G6F"
                />
              </div>
            )}

            <button type="submit" className="btn-primary py-3 justify-center font-semibold text-base mt-2 shadow-md" disabled={loading}>
              {loading ? <><Spinner size={20} /> Processing Recharge...</> : `Confirm & Recharge Wallet`}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card p-6 sm:p-8 shadow-md animate-fade-in">
          <h3 className="text-xl font-bold text-main mb-4 flex items-center gap-2">
            <History className="text-primary" size={22} /> Wallet Transaction History
          </h3>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted bg-gray-50/50 rounded-lg border border-dashed border-color">
              No transactions recorded in your wallet yet.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-color">
              {transactions.map((txn: any) => {
                const { icon, bg, label, sign } = getTxnIconAndColor(txn.type);
                return (
                  <div key={txn.id} className="py-4 flex justify-between items-center gap-4 hover:bg-gray-50/50 px-2 rounded transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${bg} shrink-0`}>
                        {icon}
                      </div>
                      <div>
                        <div className="font-semibold text-main text-sm md:text-base">{txn.description}</div>
                        <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                          <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">{label}</span>
                          {txn.referenceId && <span>Ref: {txn.referenceId}</span>}
                          <span>• {new Date(txn.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`font-bold text-base md:text-lg whitespace-nowrap ${sign === '+' ? 'text-success' : 'text-main'}`}>
                      {sign}{txn.amount.toFixed(2)} BDT
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
