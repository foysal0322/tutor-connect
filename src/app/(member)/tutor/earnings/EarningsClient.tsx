"use client";

import { useState, useTransition } from "react";
import { DollarSign, TrendingDown, Wallet } from "lucide-react";
import { submitWithdrawalRequest } from "./actions";
import { Input } from "@/components/ui/Input";
import { KPI } from "@/components/ui/KPI";
import DataGrid, { type ColumnDef } from "@/components/ui/DataGrid";
import { MfsProviderSelect } from "@/components/MfsProviderSelect";
import { FormCard, FormSubmit, FormAlert, fieldClass } from "@/components/forms";
import { bdPhoneFieldProps, onBdPhoneChange } from "@/lib/phone";

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
  availableBalance: initialAvailableBalance,
}: EarningsClientProps) {
  const [balance, setBalance] = useState(initialAvailableBalance);
  const [withdrawn, setWithdrawn] = useState(totalWithdrawn);
  const [payouts, setPayouts] = useState(withdrawalRequests);

  const [method, setMethod] = useState<"MFS" | "BANK">("MFS");
  const [mfsType, setMfsType] = useState<"BKASH" | "NAGAD" | "ROCKET">("BKASH");
  // transferType is no longer user-selectable — we always instruct users to
  // use "Send Money" (see tutorial hint). Default sent to the server.
  const transferType = "SEND_MONEY" as const;
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  // Bank fields
  const [accountHolderName, setAccountHolderName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [bftn, setBftn] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    amount: number;
    net: number;
    method: "MFS" | "BANK";
    mfsType: string;
    accountNumber: string;
    bankName: string;
    bankAccountNumber: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    if (parseFloat(amount) < 100) {
      setError("Minimum withdrawal amount is 100 BDT.");
      return;
    }
    if (method === "MFS" && (!accountNumber || accountNumber.length !== 11)) {
      setError("MFS Account Number must be exactly 11 digits.");
      return;
    }
    if (method === "BANK") {
      if (
        !accountHolderName.trim() ||
        !bankName.trim() ||
        !bankAccountNumber.trim() ||
        !branch.trim() ||
        !bftn.trim()
      ) {
        setError("Please fill in all bank details.");
        return;
      }
      if (!/^\d{9}$/.test(bftn.trim())) {
        setError("BFTN must be exactly 9 digits.");
        return;
      }
    }

    if (parseFloat(amount) > balance) {
      setError("Requested amount exceeds available balance.");
      return;
    }

    const formData = new FormData();
    formData.append("amount", amount);
    formData.append("method", method);
    if (method === "MFS") {
      formData.append("mfsType", mfsType);
      formData.append("accountNumber", accountNumber);
      formData.append("transferType", transferType);
    } else {
      formData.append("accountHolderName", accountHolderName.trim());
      formData.append("bankName", bankName.trim());
      formData.append("bankAccountNumber", bankAccountNumber.trim());
      formData.append("branch", branch.trim());
      formData.append("bftn", bftn.trim());
    }

    startTransition(async () => {
      const res = await submitWithdrawalRequest(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        const val = parseFloat(amount);
        const fee = val * 0.05;
        const net = val * 0.95;
        setSuccessData({
          amount: val,
          net,
          method,
          mfsType: method === "MFS" ? mfsType : "",
          accountNumber: method === "MFS" ? accountNumber : "",
          bankName: method === "BANK" ? bankName.trim() : "",
          bankAccountNumber: method === "BANK" ? bankAccountNumber.trim() : "",
        });

        const newRequest = {
          id: `temp-${Date.now()}`,
          amount: val,
          platformFee: fee,
          netAmount: net,
          method,
          mfsType: method === "MFS" ? mfsType : null,
          accountNumber: method === "MFS" ? accountNumber : null,
          transferType: method === "MFS" ? transferType : null,
          accountHolderName: method === "BANK" ? accountHolderName.trim() : null,
          bankName: method === "BANK" ? bankName.trim() : null,
          bankAccountNumber: method === "BANK" ? bankAccountNumber.trim() : null,
          branch: method === "BANK" ? branch.trim() : null,
          bftn: method === "BANK" ? bftn.trim() : null,
          status: "PENDING",
          createdAt: new Date(),
        } as any;

        setPayouts((prev) => [newRequest, ...prev]);
        setBalance((prev) => prev - val);
        setWithdrawn((prev) => prev + val);

        setAmount("");
        setAccountNumber("");
        setAccountHolderName("");
        setBankName("");
        setBankAccountNumber("");
        setBranch("");
        setBftn("");
      }
    });
  };

  const calculatedFee = amount ? parseFloat(amount) * 0.05 : 0;
  const calculatedNet = amount ? parseFloat(amount) * 0.95 : 0;

  // ---- DataGrid column definitions ----
  const withdrawalColumns: ColumnDef<any>[] = [
    {
      header: 'Amount',
      accessorKey: 'amount',
      sortable: true,
      cell: (w) => `${w.amount} BDT`,
    },
    {
      header: 'Method',
      id: 'method',
      cell: (w) => {
        const badge = providerBadge(w);
        return (
          <span
            style={{
              color: badge.color,
              backgroundColor: badge.bg,
              border: `1px solid ${badge.border}`,
            }}
            className="px-2 py-1 rounded-full text-[0.65rem] font-bold tracking-wider"
          >
            {badge.label}
          </span>
        );
      },
    },
    {
      header: 'Account',
      id: 'account',
      cell: (w) => {
        const isBank = w.method === 'BANK' || (!w.mfsType && !w.accountNumber);
        return isBank ? (
          <>
            <div className="font-medium">{w.bankName}</div>
            <div className="text-xs text-muted">{w.bankAccountNumber}</div>
          </>
        ) : (
          <>
            {w.accountNumber}
            <br />
            <span className="text-xs text-muted">{w.transferType}</span>
          </>
        );
      },
    },
    {
      header: 'Net Payout',
      accessorKey: 'netAmount',
      sortable: true,
      cell: (w) => <strong>{w.netAmount.toFixed(2)} BDT</strong>,
    },
    {
      header: 'Status',
      id: 'status',
      cell: (w) => (
        <span
          className={`badge ${w.status === 'PENDING' ? 'badge-info' : w.status === 'APPROVED' ? 'badge-success' : 'badge-danger'}`}
        >
          {w.status}
        </span>
      ),
    },
  ];

  const earningsColumns: ColumnDef<any>[] = [
    {
      header: 'Student',
      accessorKey: 'student.name',
      sortable: true,
      cell: (r) => <strong>{r.student.name}</strong>,
    },
    {
      header: 'Course',
      accessorKey: 'course.name',
      sortable: true,
    },
    {
      header: 'Topic',
      accessorKey: 'topic',
    },
    {
      header: 'Earning',
      accessorKey: 'budget',
      sortable: true,
      cell: (r) => <strong className="text-success-hover">+{r.budget} BDT</strong>,
    },
  ];
  // blue pill; MFS rows fall back to ROCKET color only when mfsType is set.
  const providerBadge = (w: any) => {
    if (w.method === "BANK" || (!w.mfsType && !w.accountNumber)) {
      return { color: "#1e40af", bg: "#eff6ff", border: "#1e40af", label: "BANK" };
    }
    if (w.mfsType === "BKASH") return { color: "#e2136e", bg: "#fdf2f7", border: "#e2136e", label: "BKASH" };
    if (w.mfsType === "NAGAD") return { color: "#F58220", bg: "#fff7ed", border: "#F58220", label: "NAGAD" };
    return { color: "#89288f", bg: "#f9f5fa", border: "#89288f", label: "ROCKET" };
  };

  // Human-readable destination string for a row (history + success banner).
  const destinationLabel = (w: any) => {
    if (w.method === "BANK") {
      return w.bankName || "Bank";
    }
    return w.mfsType ? `${w.mfsType} •• ${(w.accountNumber || "").slice(-4)}` : "—";
  };

  return (
    <div className="flex flex-col gap-5">
      {/* KPI row — shared primitive */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--space-4)',
        }}
      >
        <KPI
          label="Total Earned"
          value={`${totalEarned.toFixed(2)}`}
          icon={<DollarSign size={14} />}
          tone="primary"
          variant="accent"
          hint="From completed sessions"
        />
        <KPI
          label="Withdrawn / Pending"
          value={`${withdrawn.toFixed(2)}`}
          icon={<TrendingDown size={14} />}
          tone="accent"
          hint="Includes pending requests"
        />
        <KPI
          label="Available"
          value={`${balance.toFixed(2)}`}
          icon={<Wallet size={14} />}
          tone="success"
          hint="Wallet balance (withdrawable)"
        />
      </div>

      {error && <FormAlert>{error}</FormAlert>}
      {successData && (
        <div
          role="status"
          className="card"
          style={{
            background:
              "linear-gradient(135deg, rgba(34,197,94,0.10), rgba(16,185,129,0.06))",
            borderColor: "rgba(34,197,94,0.35)",
            borderTop: "4px solid var(--success, #16a34a)",
            padding: "1.25rem 1.5rem",
            display: "flex",
            gap: "1rem",
            alignItems: "flex-start",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              flexShrink: 0,
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background:
                "linear-gradient(135deg, #22c55e, #16a34a)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 20px rgba(16,185,129,0.3)",
            }}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <div className="flex flex-col gap-2" style={{ flex: 1 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3
                  className="text-success-hover font-bold"
                  style={{ fontSize: "var(--text-lg)", margin: 0 }}
                >
                  Withdrawal Request Received
                </h3>
                <p className="text-muted text-sm" style={{ marginTop: 2 }}>
                  Your request is now pending admin verification.
                </p>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setSuccessData(null)}
                className="text-muted"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "1.25rem",
                  lineHeight: 1,
                  padding: "0 4px",
                  borderRadius: 6,
                }}
              >
                ×
              </button>
            </div>

            <div
              className="grid grid-cols-3 gap-3 text-sm"
              style={{
                background: "rgba(255,255,255,0.6)",
                padding: "0.75rem 1rem",
                borderRadius: 10,
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              <div>
                <div className="text-xs text-muted">Amount</div>
                <div className="font-semibold">
                  {successData.amount.toFixed(2)} BDT
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Net Payout</div>
                <div className="font-semibold text-success-hover">
                  {successData.net.toFixed(2)} BDT
                </div>
              </div>
              <div>
                <div className="text-xs text-muted">Destination</div>
                <div className="font-semibold">
                  {successData.method === "BANK"
                    ? `${successData.bankName} •• ${successData.bankAccountNumber.slice(-4)}`
                    : `${successData.mfsType} •• ${successData.accountNumber.slice(-4)}`}
                </div>
              </div>
            </div>

            <p
              className="text-sm"
              style={{
                color: "#15803d",
                background: "rgba(34,197,94,0.08)",
                padding: "0.6rem 0.85rem",
                borderRadius: 8,
                border: "1px solid rgba(34,197,94,0.2)",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                style={{ flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              Your requested withdrawal amount will be credited to your provided
              account in the next three days.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5" style={{ alignItems: 'start' }}>
        {/* Withdrawal Request Form */}
        <FormCard
          surface="embedded"
          className="lg:col-span-1"
          icon={<Wallet size={28} />}
          title="Request Withdrawal"
          subtitle="Transfer available earnings to your MFS or bank account."
        >
          <form onSubmit={handleWithdrawSubmit} className="flex flex-col gap-4">
            {/* Withdrawal method selector */}
            <div role="radiogroup" aria-label="Withdrawal method" className={`form-group mb-0 ${fieldClass}`}>
              <label className="form-label font-bold">Withdrawal Method</label>
              <div className="grid grid-cols-2 gap-3 mt-1.5">
                {([
                  { value: "MFS" as const, title: "Mobile Wallet", sub: "bKash / Nagad / Rocket" },
                  { value: "BANK" as const, title: "Bank Account", sub: "BEFTN transfer" },
                ]).map((opt) => {
                  const active = method === opt.value;
                  return (
                    <label
                      key={opt.value}
                      style={{
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.85rem",
                        padding: "1rem",
                        minHeight: 76,
                        borderRadius: 12,
                        border: `2px solid ${active ? "var(--primary, #7c3aed)" : "rgba(15,23,42,0.12)"}`,
                        background: active ? "var(--primary-light, rgba(124,58,237,0.08))" : "transparent",
                        transition: "all 0.2s ease",
                      }}
                    >
                      <input
                        type="radio"
                        name="method"
                        value={opt.value}
                        checked={active}
                        onChange={() => setMethod(opt.value)}
                        style={{
                          accentColor: "var(--primary, #7c3aed)",
                          width: 18,
                          height: 18,
                          margin: 0,
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      />
                      <span style={{ display: "flex", flexDirection: "column", gap: 2, lineHeight: 1.3 }}>
                        <span className="font-semibold" style={{ fontSize: "0.95rem", color: "#0f172a" }}>
                          {opt.title}
                        </span>
                        <span className="text-muted" style={{ fontSize: "0.78rem" }}>
                          {opt.sub}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Input
              containerClassName={fieldClass}
              name="amount"
              type="number"
              min="100"
              step="50"
              required
              label="Withdrawal Amount (Min 100 BDT)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <Input
              containerClassName={fieldClass}
              name="couponCode"
              type="text"
              label="Commission Coupon (optional)"
              placeholder="e.g. WELCOME50"
              hint="Reduces the platform fee on this withdrawal."
            />

            {method === "MFS" ? (
              <>
                <div className={`form-group mb-0 ${fieldClass}`}>
                  <label className="form-label font-bold">MFS Provider</label>
                  <div className="mt-1.5">
                    <MfsProviderSelect value={mfsType} onChange={setMfsType} />
                  </div>
                </div>

                <Input
                  containerClassName={fieldClass}
                  name="accountNumber"
                  {...bdPhoneFieldProps}
                  required
                  label="MFS Account Number"
                  value={accountNumber}
                  onChange={onBdPhoneChange((e) => setAccountNumber(e.target.value))}
                />

                <p className="text-sm text-muted" style={{ marginTop: "-0.25rem" }}>
                  Use <strong>Send Money</strong> only. Payment type is not supported.
                </p>
              </>
            ) : (
              <>
                <Input
                  containerClassName={fieldClass}
                  name="accountHolderName"
                  required
                  label="Account Holder Name"
                  placeholder="Name as it appears on your bank account"
                  value={accountHolderName}
                  onChange={(e) => setAccountHolderName(e.target.value)}
                />
                <Input
                  containerClassName={fieldClass}
                  name="bankName"
                  required
                  label="Bank Name"
                  placeholder="e.g. City Bank, BRAC Bank, Islami Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                />
                <Input
                  containerClassName={fieldClass}
                  name="bankAccountNumber"
                  required
                  label="Bank Account Number"
                  placeholder="Your bank account number"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                />
                <Input
                  containerClassName={fieldClass}
                  name="branch"
                  required
                  label="Branch Name"
                  placeholder="e.g. Dhanmondi, Gulshan"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
                <Input
                  containerClassName={fieldClass}
                  name="bftn"
                  required
                  inputMode="numeric"
                  maxLength={9}
                  label="BFTN Number"
                  hint="9-digit Bangladesh Bank Fund Transfer Number"
                  placeholder="e.g. 123456789"
                  value={bftn}
                  onChange={(e) => setBftn(e.target.value.replace(/\D/g, ""))}
                />
              </>
            )}

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

            <FormSubmit
              loading={isPending}
              loadingText="Submitting..."
              disabled={balance <= 0}
              style={{ color: "#000" }}
            >
              {balance <= 0 ? "No balance available" : "Request Withdrawal"}
            </FormSubmit>
          </form>
        </FormCard>

        {/* Tables Column */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <div className="card card-compact">
            <h3 className="mb-3" style={{ fontSize: 'var(--text-lg)' }}>Withdrawal Payout History</h3>
            <DataGrid
              data={payouts}
              columns={withdrawalColumns}
              getRowId={(w) => w.id}
              searchable
              searchKeys={['amount', 'method', 'mfsType', 'bankName', 'accountNumber', 'status']}
              itemsPerPage={8}
              emptyMessage="No withdrawal requests found."
            />
          </div>

          {/* Earnings / Completed Tuition Sessions */}
          <div className="card card-compact">
            <h3 className="mb-3" style={{ fontSize: 'var(--text-lg)' }}>Tuition Earnings Log</h3>
            <DataGrid
              data={completedRequests}
              columns={earningsColumns}
              getRowId={(r) => r.id}
              searchable
              searchKeys={['student.name', 'course.name', 'topic']}
              itemsPerPage={8}
              emptyMessage="No completed sessions found."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
