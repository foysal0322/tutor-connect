'use client';

import React, { useState } from 'react';
import { rechargeWallet } from './actions';
import { Input } from '@/components/ui/Input';
import { FormSubmit, FormAlert, fieldClass } from '@/components/forms';
import {
  Wallet, History, PlusCircle, Lock
} from 'lucide-react';

interface WalletClientProps {
  initialBalance: number;
  initialTransactions: any[];
  userName?: string;
}

export default function WalletClient({ 
  initialBalance, 
  initialTransactions
}: WalletClientProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] = useState(initialTransactions);

  // Form states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [mfsType, setMfsType] = useState('DEMO_INSTANT');
  const [amountVal, setAmountVal] = useState('');

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
      setSuccessMsg(`Successfully deposited ৳${addedAmount.toLocaleString()} BDT!`);
      
      const newTxn = {
        id: `temp-${Date.now()}`,
        amount: addedAmount,
        type: 'RECHARGE',
        description: `Deposit via ${mfsType === 'DEMO_INSTANT' ? 'Instant Demo' : mfsType}`,
        referenceId: formData.get('transactionId') || 'DEMO-TXN',
        createdAt: new Date().toISOString()
      };
      setTransactions(prev => [newTxn, ...prev]);
      setAmountVal('');
      form?.reset();
    }
    setLoading(false);
  }

  const getTxnBadge = (type: string) => {
    switch (type) {
      case 'RECHARGE':
        return { label: 'Deposit', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', sign: '+', color: 'text-emerald-600' };
      case 'EARNING_CREDIT':
        return { label: 'Earning', bg: 'bg-indigo-100 text-indigo-800 border-indigo-200', sign: '+', color: 'text-indigo-600' };
      case 'TUITION_PAYMENT':
        return { label: 'Payment', bg: 'bg-rose-100 text-rose-800 border-rose-200', sign: '-', color: 'text-rose-600' };
      case 'WITHDRAWAL':
        return { label: 'Withdrawal', bg: 'bg-purple-100 text-purple-800 border-purple-200', sign: '-', color: 'text-purple-600' };
      default:
        return { label: type, bg: 'bg-gray-100 text-gray-800 border-gray-200', sign: '', color: 'text-gray-700' };
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-5xl">
      
      {/* SIMPLE BALANCE CARD */}
      <div className="card p-6 md:p-8 bg-white border-t-4 border-t-primary border-x border-b border-color shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-muted block mb-1">
            Available Wallet Balance
          </span>
          <div className="text-3xl md:text-4xl font-extrabold text-main flex items-baseline gap-2">
            ৳{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className="text-lg font-bold text-primary">BDT</span>
          </div>
          <p className="text-xs text-muted mt-1 m-0">
            Funds can be used for instant tuition payments or withdrawn to your MFS account.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-primary-light text-primary flex items-center justify-center self-start sm:self-auto">
          <Wallet size={32} />
        </div>
      </div>

      {/* SIMPLE 2-COLUMN LAYOUT: DEPOSIT ON LEFT, HISTORY ON RIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: DEPOSIT FORM (7 cols) */}
        <div className="card p-6 sm:p-8 bg-white border border-color shadow-sm lg:col-span-7">
          <div className="flex items-center gap-2 mb-2">
            <PlusCircle className="text-primary" size={22} />
            <h3 className="text-xl font-bold text-main m-0">Deposit Funds</h3>
          </div>
          <p className="text-sm text-muted m-0 mb-6">
            Choose your MFS provider, enter the amount and transaction ID to top up your balance.
          </p>

          {error && <FormAlert>{error}</FormAlert>}

          {successMsg && <FormAlert tone="success">{successMsg}</FormAlert>}

          <form onSubmit={handleRecharge} className="flex flex-col gap-6">
            
            {/* LARGE RESIZED MFS BUTTONS WITH WITHDRAWAL PAGE STYLING */}
            <div>
              <label className="text-xs font-bold text-muted uppercase tracking-wider block mb-3">
                Select MFS Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMfsType('DEMO_INSTANT')}
                  className={`py-3.5 px-4 rounded-xl font-bold border-2 transition-all text-sm sm:text-base ${mfsType === 'DEMO_INSTANT' ? 'shadow-md text-white' : 'bg-white hover:shadow-sm'}`}
                  style={{
                    backgroundColor: mfsType === 'DEMO_INSTANT' ? '#10B981' : 'white',
                    borderColor: mfsType === 'DEMO_INSTANT' ? '#10B981' : 'var(--border-color)',
                    color: mfsType === 'DEMO_INSTANT' ? 'white' : '#10B981'
                  }}
                >
                  Instant Demo
                </button>

                <button
                  type="button"
                  onClick={() => setMfsType('bKash')}
                  className={`py-3.5 px-4 rounded-xl font-bold border-2 transition-all text-sm sm:text-base ${mfsType === 'bKash' ? 'shadow-md text-white' : 'bg-white hover:shadow-sm'}`}
                  style={{
                    backgroundColor: mfsType === 'bKash' ? '#E2136E' : 'white',
                    borderColor: mfsType === 'bKash' ? '#E2136E' : 'var(--border-color)',
                    color: mfsType === 'bKash' ? 'white' : '#E2136E'
                  }}
                >
                  bKash
                </button>

                <button
                  type="button"
                  onClick={() => setMfsType('Nagad')}
                  className={`py-3.5 px-4 rounded-xl font-bold border-2 transition-all text-sm sm:text-base ${mfsType === 'Nagad' ? 'shadow-md text-white' : 'bg-white hover:shadow-sm'}`}
                  style={{
                    backgroundColor: mfsType === 'Nagad' ? '#F58220' : 'white',
                    borderColor: mfsType === 'Nagad' ? '#F58220' : 'var(--border-color)',
                    color: mfsType === 'Nagad' ? 'white' : '#F58220'
                  }}
                >
                  Nagad
                </button>

                <button
                  type="button"
                  onClick={() => setMfsType('Rocket')}
                  className={`py-3.5 px-4 rounded-xl font-bold border-2 transition-all text-sm sm:text-base ${mfsType === 'Rocket' ? 'shadow-md text-white' : 'bg-white hover:shadow-sm'}`}
                  style={{
                    backgroundColor: mfsType === 'Rocket' ? '#89288f' : 'white',
                    borderColor: mfsType === 'Rocket' ? '#89288f' : 'var(--border-color)',
                    color: mfsType === 'Rocket' ? 'white' : '#89288f'
                  }}
                >
                  Rocket
                </button>
              </div>
            </div>

            {/* LARGE RESIZED AMOUNT INPUT TEXT BOX */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-muted uppercase tracking-wider">
                Deposit Amount (Min 50 BDT)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-extrabold text-muted pointer-events-none">
                  ৳
                </span>
                <input
                  name="amount"
                  type="number"
                  step="any"
                  min="50"
                  required
                  value={amountVal}
                  onChange={(e) => setAmountVal(e.target.value)}
                  placeholder="e.g. 500 or 1000"
                  className="w-full pl-11 pr-4 py-3.5 text-xl sm:text-2xl font-extrabold text-main bg-gray-50 border-2 border-color rounded-xl focus:outline-none focus:border-primary focus:bg-white transition-all shadow-inner"
                />
              </div>
            </div>

            {/* RESIZED VERIFICATION TEXT BOXES FOR MFS */}
            {mfsType !== 'DEMO_INSTANT' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 animate-fade-in">
                <Input
                  containerClassName={fieldClass}
                  name="accountNumber"
                  type="text"
                  required
                  label="Your MFS Number"
                  placeholder="e.g. 017XXXXXXXX"
                />
                <Input
                  containerClassName={fieldClass}
                  name="transactionId"
                  type="text"
                  required
                  label="Transaction ID (TrxID)"
                  placeholder="e.g. 9J8H7G6F21"
                />
              </div>
            )}

            {mfsType === 'DEMO_INSTANT' && (
              <div className="p-3.5 rounded-xl bg-gray-50 border border-color text-xs text-muted leading-relaxed">
                <strong className="text-main">Demo Mode:</strong> No account number or SMS transaction ID is required. Funds will credit instantly for testing.
              </div>
            )}

            <FormSubmit loading={loading} loadingText="Processing Deposit..." icon={<Lock size={18} />}>
              Confirm Deposit
            </FormSubmit>
          </form>
        </div>

        {/* RIGHT COLUMN: TRANSACTION HISTORY (5 cols) */}
        <div className="card p-6 sm:p-8 bg-white border border-color shadow-sm lg:col-span-5 flex flex-col h-full min-h-[420px]">
          <div className="flex items-center justify-between pb-3.5 border-b border-color mb-4">
            <div className="flex items-center gap-2">
              <History className="text-primary" size={20} />
              <h3 className="text-lg font-bold text-main m-0">Transaction History</h3>
            </div>
            <span className="text-xs bg-gray-100 text-muted font-bold px-2.5 py-1 rounded-full">
              {transactions.length} items
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-muted">
              <History size={36} className="text-gray-300 mb-2.5" />
              <p className="text-sm font-semibold text-main m-0">No transactions found</p>
              <p className="text-xs text-muted m-0 mt-1">Your deposit and payment logs will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-color overflow-y-auto max-h-[520px] pr-1">
              {transactions.map((txn: any) => {
                const badge = getTxnBadge(txn.type);
                return (
                  <div key={txn.id} className="py-4 flex items-center justify-between gap-3 hover:bg-gray-50/75 px-2 -mx-2 rounded-xl transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-main text-sm truncate">{txn.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs text-muted">
                          {new Date(txn.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                    </div>

                    <div className={`font-extrabold text-base whitespace-nowrap ${badge.color}`}>
                      {badge.sign}৳{parseFloat(txn.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
