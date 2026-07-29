"use client";

import { useState } from "react";
import DataGrid, { ColumnDef } from "@/components/ui/DataGrid";
import { verifyWithdrawalRequest } from "./actions";
import { Select } from "@/components/ui/Select";

type WithdrawalRow = {
  id: string;
  tutorName: string;
  tutorEmail: string;
  amount: number;
  platformFee: number;
  netAmount: number;
  mfsType: string;
  accountNumber: string;
  transferType: string;
  status: string;
  createdAt: string;
};

const MFS_COLOR: Record<string, string> = {
  BKASH: "#d1417a",
  NAGAD: "#f67221",
  ROCKET: "#8c2a8c",
};

export default function WithdrawalManager({
  initialRequests,
}: {
  initialRequests: any[];
}) {
  const [requests, setRequests] = useState<WithdrawalRow[]>(
    initialRequests.map((w) => ({
      id: w.id,
      tutorName: w.tutor.name,
      tutorEmail: w.tutor.email,
      amount: w.amount,
      platformFee: w.platformFee,
      netAmount: w.netAmount,
      mfsType: w.mfsType,
      accountNumber: w.accountNumber,
      transferType: w.transferType,
      status: w.status,
      createdAt: new Date(w.createdAt).toLocaleDateString(),
    })),
  );
  const [statusFilter, setStatusFilter] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = (() => {
    const result = statusFilter
      ? requests.filter((w) => w.status === statusFilter)
      : requests;
    return [...result].sort((a, b) => {
      if (a.status === "PENDING" && b.status !== "PENDING") return -1;
      if (a.status !== "PENDING" && b.status === "PENDING") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  })();

  async function handleVerify(id: string, approve: boolean) {
    const actionName = approve ? "approve" : "reject";
    if (
      !confirm(
        `Are you sure you want to ${actionName} this withdrawal request?`,
      )
    )
      return;

    setLoadingId(id);
    const res = await verifyWithdrawalRequest(id, approve);
    if (res?.error) {
      alert(res.error);
    } else {
      setRequests((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, status: approve ? "APPROVED" : "REJECTED" } : w,
        ),
      );
    }
    setLoadingId(null);
  }

  const columns: ColumnDef<WithdrawalRow>[] = [
    {
      header: "Tutor",
      accessorKey: "tutorName",
      cell: (row) => (
        <div>
          <div className='font-semibold text-main'>{row.tutorName}</div>
          <div className='text-xs text-muted mt-1'>Email: {row.tutorEmail}</div>
        </div>
      ),
    },
    {
      header: "Requested",
      accessorKey: "amount",
      cell: (row) => `${row.amount.toFixed(2)} BDT`,
    },
    {
      header: "Platform Fee (5%)",
      accessorKey: "platformFee",
      cell: (row) => `${row.platformFee.toFixed(2)} BDT`,
    },
    {
      header: "Net Payout",
      accessorKey: "netAmount",
      cell: (row) => (
        <span className='font-semibold text-primary'>
          {row.netAmount.toFixed(2)} BDT
        </span>
      ),
    },
    {
      header: "MFS Method & Account",
      cell: (row) => (
        <div>
          <div
            className='text-sm font-bold'
            style={{ color: MFS_COLOR[row.mfsType] ?? "var(--text-main)" }}
          >
            {row.mfsType}
          </div>
          <div className='font-medium text-main'>{row.accountNumber}</div>
          <div className='text-xs text-muted mt-1'>
            Type: {row.transferType}
          </div>
        </div>
      ),
    },
    { header: "Request Date", accessorKey: "createdAt" },
    {
      header: "Status",
      accessorKey: "status",
      cell: (row) => (
        <span
          className={`badge ${row.status === "PENDING" ? "badge-primary" : row.status === "APPROVED" ? "badge-success" : "badge-danger"}`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Action",
      cell: (row) =>
        row.status === "PENDING" ? (
          <div className='flex gap-2'>
            <button
              onClick={() => handleVerify(row.id, true)}
              disabled={loadingId === row.id}
              className='btn bg-success text-white hover:bg-success-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors'
            >
              Approve
            </button>
            <button
              onClick={() => handleVerify(row.id, false)}
              disabled={loadingId === row.id}
              className='btn bg-danger text-white hover:bg-danger-hover px-3 py-1.5 text-xs font-semibold rounded-md transition-colors'
            >
              Reject
            </button>
          </div>
        ) : (
          <span className='text-muted text-sm italic'>Processed</span>
        ),
    },
  ];

  return (
    <div className='card p-0 overflow-hidden'>
      <div className='flex flex-col sm:flex-row gap-4 p-4 border-b border-color bg-gray-50/50'>
        <div className='w-full sm:w-64 ml-auto'>
          <Select
            label='Filter by status'
            hideLabel
            value={statusFilter}
            onChange={setStatusFilter}
            placeholderOption='All Statuses'
            options={[
              { value: "PENDING", label: "Pending" },
              { value: "APPROVED", label: "Approved" },
              { value: "REJECTED", label: "Rejected" },
            ]}
          />
        </div>
      </div>

      <DataGrid
        data={filtered}
        columns={columns}
        searchable={false}
        emptyMessage='No withdrawal requests found.'
      />
    </div>
  );
}
