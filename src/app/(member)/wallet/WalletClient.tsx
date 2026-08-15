"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Wallet,
  Zap,
} from "lucide-react";

import { rechargeWallet, RechargeWalletState } from "./actions";
import { formatBDT } from "@/lib/format";
import { bdPhoneFieldProps, onBdPhoneChange } from "@/lib/phone";
import { useToast } from "@/components/ToastProvider";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { KPI } from "@/components/ui/KPI";
import { MfsProviderSelect, MfsProvider, MFS_LABEL } from "@/components/MfsProviderSelect";
import { FormSubmit, FormAlert, fieldClass } from "@/components/forms";
import { StatusBadge } from "@/components/ui/StatusBadge";
import s from "./wallet.module.css";

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

interface WalletTransaction {
  id: string;
  amount: number;
  type: string;
  description: string;
  referenceId: string | null;
  status?: string;
  createdAt: string | Date;
}

interface Withdrawal {
  id: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  mfsType: string | null;
  accountNumber: string | null;
  transferType: string | null;
  status: string;
  createdAt: string | Date;
}

interface WalletClientProps {
  initialBalance: number;
  initialTransactions: WalletTransaction[];
  totalDeposited: number;
  totalSpent: number;
  recentWithdrawals: Withdrawal[];
  userName?: string;
}

/* ------------------------------------------------------------------ *
 * Transaction metadata — direction + tone per type.
 * amount is signed in the DB (+:credit, −:debit); we render Math.abs() with
 * the direction sign below so debits never show a double negative.
 * ------------------------------------------------------------------ */

type Direction = "in" | "out";

function txnMeta(type: string): {
  label: string;
  direction: Direction;
  tone: "success" | "info" | "danger" | "neutral";
} {
  switch (type) {
    case "RECHARGE":
      return { label: "Deposit", direction: "in", tone: "success" };
    case "EARNING_CREDIT":
      return { label: "Earning", direction: "in", tone: "info" };
    case "TUITION_PAYMENT":
      return { label: "Tuition", direction: "out", tone: "danger" };
    case "WITHDRAWAL":
      return { label: "Withdrawal", direction: "out", tone: "neutral" };
    default:
      return { label: type, direction: "in", tone: "neutral" };
  }
}

function formatDate(d: string | Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

export default function WalletClient({
  initialBalance,
  initialTransactions,
  totalDeposited,
  totalSpent,
  recentWithdrawals,
}: WalletClientProps) {
  const { toast } = useToast();

  const [balance, setBalance] = useState(initialBalance);
  const [transactions, setTransactions] =
    useState<WalletTransaction[]>(initialTransactions);
  const [withdrawals] = useState<Withdrawal[]>(recentWithdrawals);

  // Deposit form. The form uses action={formAction} (server action via
  // useActionState) instead of a client onSubmit, so it is progressively
  // enhanced: submitting before hydration completes still POSTs to the server
  // action instead of doing a native GET navigation (which used to dump the
  // field values into the URL and silently reload the page).
  const [state, formAction, pending] = useActionState(
    rechargeWallet,
    {} as RechargeWalletState
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [mfsType, setMfsType] = useState<MfsProvider>("BKASH");
  const [amountVal, setAmountVal] = useState("");
  // Receipt shown in the success modal. The form is only reset once the user
  // acknowledges it (OK / close), so the entered values don't vanish abruptly.
  const [receipt, setReceipt] = useState<{
    amount: number;
    mfsType: string;
  } | null>(null);
  const handledNonce = useRef(0);

  // Transaction filter
  const [txnFilter, setTxnFilter] = useState<"all" | "in" | "out">("all");

  const filteredTxns = useMemo(() => {
    if (txnFilter === "all") return transactions;
    return transactions.filter((t) => txnMeta(t.type).direction === txnFilter);
  }, [transactions, txnFilter]);

  const pendingWithdrawals = useMemo(
    () => withdrawals.filter((w) => w.status === "PENDING"),
    [withdrawals]
  );

  /* ----- handlers --------------------------------------------------------- */

  // React to a submitted deposit request: append the PENDING transaction and
  // pop the receipt modal. The balance is intentionally NOT touched — an
  // admin must verify the TrxID and approve before the money lands.
  useEffect(() => {
    if (
      !state?.success ||
      !state.timestamp ||
      state.timestamp === handledNonce.current
    )
      return;
    handledNonce.current = state.timestamp;

    const added = state.amount ?? 0;
    if (added > 0) {
      setTransactions((prev) => [
        {
          id: `temp-${state.timestamp}`,
          amount: added,
          type: "RECHARGE",
          description: `Wallet recharge via ${state.mfsType}`,
          referenceId: state.transactionId ?? null,
          status: "PENDING",
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
    setReceipt({ amount: added, mfsType: state.mfsType ?? "" });
    toast.success(`Deposit request submitted — awaiting admin verification.`);
  }, [state, toast]);

  // Acknowledge the receipt: close the modal, THEN reset the form.
  function closeReceipt() {
    setReceipt(null);
    setAmountVal("");
    formRef.current?.reset();
  }

  /* ----- render ----------------------------------------------------------- */

  return (
    <div className={`flex flex-col gap-5 animate-fade-in w-full ${s.wrap}`}>
      {/* ---------- Header ---------- */}
      <header>
        <h1
          style={{
            fontSize: "var(--text-2xl)",
            marginBottom: "var(--space-1)",
          }}
        >
          Campus Wallet
        </h1>
        <p style={{ color: "var(--text-muted)", maxWidth: "42rem", margin: 0 }}>
          Top up your balance, track tuition payments, and monitor withdrawals —
          all in one place.
        </p>
      </header>

      {/* ---------- Balance hero + KPIs ---------- */}
      <section
        className={s.balanceHero}
        style={{
          background: "var(--card-bg)",
          border: "1px solid var(--border-color)",
          borderTop: "4px solid var(--primary)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div className={s.balanceMain}>
          <span className={s.balanceLabel}>Available Balance</span>
          <div className={s.balanceValue}>
            <span>{formatBDT(balance)}</span>
            <span className={s.currency}>TK</span>
          </div>
          <p className={s.balanceHint}>
            Use it for instant tuition payments or request a withdrawal to your
            bKash / Nagad / Rocket or bank account.
          </p>
        </div>
        <div
          className="p-4 rounded-2xl bg-primary-light text-primary flex items-center justify-center self-start sm:self-auto"
          style={{ flexShrink: 0 }}
        >
          <Wallet size={32} aria-hidden="true" />
        </div>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "var(--space-4)",
        }}
      >
        <KPI
          label="Total Deposited"
          value={`${formatBDT(totalDeposited)} TK`}
          icon={<ArrowDownLeft size={14} />}
          tone="success"
          hint="Lifetime wallet top-ups"
        />
        <KPI
          label="Total Spent (Tuition)"
          value={`${formatBDT(totalSpent)} TK`}
          icon={<ArrowUpRight size={14} />}
          tone="danger"
          hint="Paid toward tutoring sessions"
        />
        {pendingWithdrawals.length > 0 && (
          <KPI
            label={`Pending Withdrawal${pendingWithdrawals.length > 1 ? "s" : ""}`}
            value={`${formatBDT(pendingWithdrawals.reduce((s2, w) => s2 + w.amount, 0))} TK`}
            icon={<Clock size={14} />}
            tone="info"
            hint={`${pendingWithdrawals.length} awaiting review`}
          />
        )}
      </div>

      {/* ---------- Withdrawal activity (tutors) ---------- */}
      {withdrawals.length > 0 && (
        <section className="card" style={{ padding: "var(--space-6)" }}>
          <div className={s.sectionHead}>
            <div className={s.sectionTitle}>
              <Clock size={18} aria-hidden="true" /> Withdrawal Activity
            </div>
            <Link href="/tutor/earnings" className="btn-outline btn-sm">
              Request withdrawal
            </Link>
          </div>
          <ul className={s.withdrawalList}>
            {withdrawals.map((w) => (
              <li key={w.id} className={s.withdrawalRow}>
                <div className={s.withdrawalInfo}>
                  <span className={s.withdrawalAmount}>
                    {formatBDT(w.amount)} TK{" "}
                    <span className={s.muted}>
                      · net {formatBDT(w.netAmount)} TK
                    </span>
                  </span>
                  <span className={s.withdrawalMeta}>
                    {w.mfsType ?? "BANK"} · ••••
                    {(w.accountNumber ?? "").slice(-4)} ·{" "}
                    {(w.transferType ?? "SEND_MONEY")
                      .replace("_", " ")
                      .toLowerCase()}{" "}
                    · {formatDate(w.createdAt)}
                  </span>
                </div>
                <StatusBadge status={w.status} domain="withdrawal" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------- Deposit + Transactions ---------- */}
      <div className={s.twoCol}>
        {/* LEFT: Deposit form */}
        <div className={`card ${s.depositCol}`}>
          <div className={s.formHead}>
            <Zap size={20} aria-hidden="true" className="text-primary" />
            <h2 className={s.formTitle}>Deposit Funds</h2>
          </div>
          <p className={s.formSub}>
            Send Money from your bKash, Nagad, or Rocket account, then submit
            the amount and TrxID below. Your wallet is credited after an admin
            verifies the transaction.
          </p>

          {state?.error && <FormAlert>{state.error}</FormAlert>}

          <form
            ref={formRef}
            action={formAction}
            className="flex flex-col"
            style={{ gap: "var(--space-5)" }}
          >
            {/* Included as a hidden field so the server action receives it even
                on a pre-hydration (progressively enhanced) submit. */}
            <input type="hidden" name="mfsType" value={mfsType} />

            {/* MFS provider */}
            <div>
              <label className={s.fieldLabel}>Send Money From (bKash / Nagad / Rocket)</label>
              <MfsProviderSelect
                value={mfsType}
                onChange={setMfsType}
                idPrefix="wallet-mfs"
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col" style={{ gap: "var(--space-2)" }}>
              <label className={s.fieldLabel} htmlFor="wallet-amount">
                Deposit Amount (Min 50 BDT)
              </label>
              <div style={{ position: "relative" }}>
                <span className={s.amountPrefix} aria-hidden="true">
                  TK
                </span>
                <input
                  id="wallet-amount"
                  name="amount"
                  type="number"
                  step="any"
                  min="50"
                  required
                  value={amountVal}
                  onChange={(e) => setAmountVal(e.target.value)}
                  // Scrolling over the field would silently bump the amount.
                  // Blur on wheel so the wheel scrolls the page instead (same
                  // behavior as the shared Input component).
                  onWheel={(e) => e.currentTarget.blur()}
                  placeholder="e.g. 500 or 1000"
                  className={`form-input ${s.amountInput}`}
                />
              </div>
            </div>

            {/* MFS verification fields */}
            <div className={s.verifyGrid}>
              <Input
                containerClassName={fieldClass}
                name="accountNumber"
                {...bdPhoneFieldProps}
                required
                label={`Your ${MFS_LABEL[mfsType]} Number`}
                hint="The number you sent money from"
                onChange={onBdPhoneChange()}
              />
              <Input
                containerClassName={fieldClass}
                name="transactionId"
                type="text"
                required
                label="Transaction ID (TrxID)"
                hint={`The TrxID from your ${MFS_LABEL[mfsType]} confirmation SMS`}
                placeholder="e.g. 9J8H7G6F21"
              />
            </div>

            <FormSubmit
              loading={pending}
              loadingText="Processing Deposit…"
              icon={<CheckCircle2 size={18} />}
            >
              Confirm Deposit
            </FormSubmit>
          </form>

          {/* Receipt — the form only resets once this is acknowledged. */}
          <Modal
            open={!!receipt}
            onClose={closeReceipt}
            title="Deposit Request Submitted"
            footer={
              <button
                type="button"
                className="btn-primary"
                onClick={closeReceipt}
              >
                OK
              </button>
            }
          >
            <div
              className="flex flex-col items-center text-center"
              style={{ gap: "var(--space-3)" }}
            >
              <Clock size={48} className="text-primary" aria-hidden="true" />
              <p
                style={{
                  fontSize: "var(--text-lg)",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                Deposit request of {formatBDT(receipt?.amount ?? 0)} TK
                {receipt?.mfsType ? ` via ${receipt.mfsType}` : ""} submitted.
              </p>
              <p style={{ color: "var(--text-muted)", margin: 0 }}>
                Your wallet will be credited once an admin verifies your
                transaction ID. You can track the status in your transaction
                history section.
              </p>
            </div>
          </Modal>
        </div>

        {/* RIGHT: Transaction history */}
        <div className={`card ${s.historyCol}`}>
          <div className={s.historyHead}>
            <div className={s.sectionTitle}>
              <Wallet size={18} aria-hidden="true" /> Transaction History
            </div>
            <Badge tone="neutral">{transactions.length} total</Badge>
          </div>

          {/* Filter chips */}
          {transactions.length > 0 && (
            <div
              className={s.filterRow}
              role="group"
              aria-label="Filter transactions"
            >
              {(["all", "in", "out"] as const).map((f) => (
                <label key={f} className={s.filterChip}>
                  <input
                    type="radio"
                    name="txnfilter"
                    value={f}
                    checked={txnFilter === f}
                    onChange={() => setTxnFilter(f)}
                    className="sr-only"
                  />
                  <span>
                    {f === "all"
                      ? "All"
                      : f === "in"
                        ? "Money In"
                        : "Money Out"}
                  </span>
                </label>
              ))}
            </div>
          )}

          {transactions.length === 0 ? (
            <div className={s.historyEmpty}>
              <Wallet size={36} aria-hidden="true" />
              <p className={s.emptyTitle}>No transactions yet</p>
              <p className={s.emptySub}>
                Your deposits and tuition payments will appear here.
              </p>
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className={s.historyEmpty}>
              <p className={s.emptyTitle}>
                No {txnFilter === "in" ? "credits" : "debits"} to show
              </p>
              <p className={s.emptySub}>Try a different filter.</p>
            </div>
          ) : (
            <ul className={s.txnList}>
              {filteredTxns.map((txn) => {
                const meta = txnMeta(txn.type);
                const isIn = meta.direction === "in";
                return (
                  <li key={txn.id} className={s.txnRow}>
                    <span
                      className={isIn ? s.txnIconIn : s.txnIconOut}
                      aria-hidden="true"
                    >
                      {isIn ? (
                        <ArrowDownLeft size={16} />
                      ) : (
                        <ArrowUpRight size={16} />
                      )}
                    </span>
                    <div className={s.txnBody}>
                      <span className={s.txnDesc}>{txn.description}</span>
                      <span className={s.txnMetaRow}>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        {txn.type === "RECHARGE" &&
                          txn.status &&
                          txn.status !== "COMPLETED" && (
                            <StatusBadge status={txn.status} domain="deposit" />
                          )}
                        <span className={s.txnDate}>
                          {formatDate(txn.createdAt)}
                        </span>
                      </span>
                    </div>
                    <span
                      className={isIn ? s.txnAmountIn : s.txnAmountOut}
                      title={isIn ? "Credit" : "Debit"}
                    >
                      {isIn ? "+" : "−"}
                      {formatBDT(txn.amount)} TK
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
