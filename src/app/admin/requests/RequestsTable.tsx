'use client';

/**
 * RequestsTable — DataGrid-backed table for the admin requests page.
 *
 * Phase 6.7: extracted from RequestManager.tsx. Owns no state — receives
 * the filtered/sorted request list + the action callbacks from the parent.
 *
 * Columns:
 *   1. Student (name + nsuId + email)
 *   2. Course / Details (course + topic + mode + time + budget)
 *   3. Status (refund-aware badge)
 *   4. Assigned Tutor (or "Unassigned")
 *   5. Action (AssignTutorForm | PaymentVerifyRow | RefundVerifyRow | fallback)
 *
 * The action column renders rich content (forms, info cards), so rows can
 * be tall — same as the pre-redesign layout. DataGrid's mobile card view
 * handles small viewports automatically.
 */

import DataGrid, { type ColumnDef } from '@/components/ui/DataGrid';
import AssignTutorForm from './AssignTutorForm';
import PaymentVerifyRow from './PaymentVerifyRow';
import RefundVerifyRow from './RefundVerifyRow';
import {
  getPendingRefund,
  getStatusBadgeClass,
  getStatusLabel,
  type RequestRow,
} from './status';

interface RequestsTableProps {
  requests: RequestRow[];
  tutors: any[];
  refundFeePercent: number;
  loadingId: string | null;
  onApprovePayment: (requestId: string) => void;
  onRejectPayment: (requestId: string) => void;
  onApproveRefund: (refundId: string, requestId: string, note?: string) => void;
  onRejectRefund: (refundId: string, requestId: string, note?: string) => void;
}

export default function RequestsTable({
  requests,
  tutors,
  refundFeePercent,
  loadingId,
  onApprovePayment,
  onRejectPayment,
  onApproveRefund,
  onRejectRefund,
}: RequestsTableProps) {
  const columns: ColumnDef<RequestRow>[] = [
    {
      header: 'Student',
      accessorKey: 'student',
      cell: (req) => (
        <div>
          <div className='font-semibold text-main'>{req.student.name}</div>
          <div className='text-xs text-muted mt-1'>ID: {req.student.nsuId}</div>
          <div className='text-xs text-muted'>Email: {req.student.email}</div>
        </div>
      ),
    },
    {
      header: 'Course / Details',
      accessorKey: 'course',
      cell: (req) => (
        <div>
          <div className='font-semibold text-main'>{req.course.name}</div>
          <div className='text-sm text-muted mt-1'>Topic: {req.topic}</div>
          <div className='text-sm text-muted'>Mode: {req.preferredMode}</div>
          {req.preferredDateTime && (
            <div className='text-sm text-muted'>
              Time: {new Date(req.preferredDateTime).toLocaleString()}
            </div>
          )}
          <div className='text-sm font-semibold text-primary mt-1'>{req.budget} BDT</div>
        </div>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (req) => (
        <span className={`badge ${getStatusBadgeClass(req)}`}>{getStatusLabel(req)}</span>
      ),
    },
    {
      header: 'Assigned Tutor',
      accessorKey: 'assignedTutor',
      cell: (req) =>
        req.assignedTutor ? (
          <div>
            <div className='font-semibold text-main'>{req.assignedTutor.name}</div>
            <div className='text-xs text-muted mt-1'>Email: {req.assignedTutor.email}</div>
          </div>
        ) : (
          <span className='text-sm text-muted italic'>Unassigned</span>
        ),
    },
    {
      header: 'Payment & Refunds / Action',
      accessorKey: 'id',
      cell: (req) => {
        const pendingRefund = getPendingRefund(req);
        const rowLoading = loadingId === req.id || (!!pendingRefund && loadingId === pendingRefund.id);

        return (
          <>
            {/* Case 1: waiting for tutor assignment */}
            {req.status === 'PENDING' && (
              <AssignTutorForm
                requestId={req.id}
                courseId={req.courseId}
                tutors={tutors}
              />
            )}

            {/* Case 2: payment pending verification */}
            {req.status === 'PAYMENT_PENDING' && req.payment && (
              <PaymentVerifyRow
                req={req}
                loading={rowLoading}
                onApprove={onApprovePayment}
                onReject={onRejectPayment}
              />
            )}

            {/* Case 3: refund pending approval */}
            {pendingRefund && (
              <RefundVerifyRow
                req={req}
                refundFeePercent={refundFeePercent}
                loading={rowLoading}
                onApprove={onApproveRefund}
                onReject={onRejectRefund}
              />
            )}

            {/* Fallback when nothing is actionable */}
            {req.status !== 'PENDING' &&
              req.status !== 'PAYMENT_PENDING' &&
              !pendingRefund && (
                <span className='text-sm text-muted'>No pending actions</span>
              )}
          </>
        );
      },
    },
  ];

  return (
    <DataGrid
      data={requests}
      columns={columns}
      searchable={false}
      itemsPerPage={15}
      getRowId={(req) => req.id}
      emptyState={{
        title: 'No requests found matching your filters.',
      }}
    />
  );
}
