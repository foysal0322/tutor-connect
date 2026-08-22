'use client';

/**
 * AssignedStudentDetailSheet — tutor-side request detail drawer.
 *
 * Opens when a tutor clicks a row in the Assigned Students table. Shows the
 * full request context, the student's profile, and — only once the session is
 * ACCEPTED (payment verified) — the student's contact details.
 *
 * The contact fields arrive as `null` from the server unless the session is
 * active (TeachingPanel strips them), so the lock states below can never be
 * bypassed from the client payload.
 */

import { Mail, Phone, Lock, Clock, Star, CheckCircle2, XCircle } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import type { AssignedStudent } from './AssignedStudentsTable';

const STATUS_CLASS: Record<string, string> = {
  COMPLETED: 'badge-success',
  ACCEPTED: 'badge-info',
  MATCHED: 'badge-warning',
  PAYMENT_PENDING: 'badge-warning',
  CANCELLED: 'badge-danger',
  PENDING: 'badge-warning',
};

/** Tutor-perspective next step per status — what should I do / wait for? */
function statusGuidance(r: AssignedStudent): {
  text: string;
  icon: 'lock' | 'clock' | 'active' | 'done' | 'cancelled';
} {
  switch (r.status) {
    case 'MATCHED':
      return {
        text: "You've been matched. Waiting for the student to pay — their contact details unlock once the payment is verified.",
        icon: 'lock',
      };
    case 'PAYMENT_PENDING':
      return {
        text: 'The student has paid. Waiting for admin to verify the payment before the session becomes active.',
        icon: 'clock',
      };
    case 'ACCEPTED':
      return {
        text: 'Session active. Reach out to the student to schedule your session.',
        icon: 'active',
      };
    case 'COMPLETED':
      return { text: 'Session completed.', icon: 'done' };
    case 'CANCELLED':
      return { text: 'This request was cancelled.', icon: 'cancelled' };
    default:
      return { text: 'Waiting for admin to process this request.', icon: 'clock' };
  }
}

function GuidanceIcon({ kind }: { kind: ReturnType<typeof statusGuidance>['icon'] }) {
  const size = 16;
  switch (kind) {
    case 'lock':
      return <Lock size={size} aria-hidden='true' />;
    case 'clock':
      return <Clock size={size} aria-hidden='true' />;
    case 'active':
      return <CheckCircle2 size={size} aria-hidden='true' />;
    case 'done':
      return <Star size={size} aria-hidden='true' />;
    case 'cancelled':
      return <XCircle size={size} aria-hidden='true' />;
  }
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <strong>{children}</strong>
    </div>
  );
}

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
  gap: '1rem',
  background: 'var(--bg-color)',
  padding: '1rem',
  borderRadius: '8px',
};

export default function AssignedStudentDetailSheet({
  request,
  onClose,
}: {
  request: AssignedStudent | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      open={!!request}
      onClose={onClose}
      title={request ? `${request.studentName} — ${request.courseName}` : ''}
      size='40rem'
    >
      {request && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Status badge + request age */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <span
              className={`badge ${STATUS_CLASS[request.status] ?? 'badge-warning'}`}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: '50px',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              {request.status.replace('_', ' ')}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Requested{' '}
              {new Date(request.createdAt).toLocaleDateString('en-US', {
                timeZone: 'UTC',
              })}
            </span>
          </div>

          {/* Next-step guidance */}
          {(() => {
            const g = statusGuidance(request);
            return (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-main)',
                }}
              >
                <span style={{ flexShrink: 0, marginTop: '0.1rem' }}>
                  <GuidanceIcon kind={g.icon} />
                </span>
                <span>{g.text}</span>
              </div>
            );
          })()}

          {/* Request details */}
          <div style={gridStyle}>
            <Field label='Topic'>{request.topic || 'General assistance'}</Field>
            <Field label='Faculty'>{request.facultyName || 'Any'}</Field>
            <Field label='Mode'>{request.preferredMode}</Field>
            <Field label='Preferred Time'>
              {request.preferredDateTime
                ? new Date(request.preferredDateTime).toLocaleString('en-US', {
                    timeZone: 'UTC',
                  })
                : 'N/A'}
            </Field>
            <Field label='Budget'>{request.budget.toLocaleString()} BDT</Field>
          </div>

          {/* Student profile — symmetric with what students see about tutors */}
          <div
            style={{
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '1rem',
              background: 'var(--surface-1)',
            }}
          >
            <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Student</h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: '0.75rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                Name: <strong>{request.studentName}</strong>
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                NSU ID: <strong>{request.student.nsuId}</strong>
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                Dept:{' '}
                <strong>{request.student.departmentName ?? 'N/A'}</strong>
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                Gender: <strong>{request.student.gender ?? 'N/A'}</strong>
              </p>
              <p style={{ margin: 0, fontSize: '0.95rem' }}>
                CGPA:{' '}
                <strong>
                  {request.student.cgpa != null
                    ? request.student.cgpa.toFixed(2)
                    : 'N/A'}
                </strong>
              </p>
            </div>

            {/* Contact — unlocked only on an active (paid) session. The
                server nulls these out otherwise, so a null here always means
                "not yet available", never "missing field". */}
            {request.student.email && request.student.contact ? (
              <div
                style={{
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px dashed var(--border-color)',
                  background: 'var(--info-light, #eff6ff)',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  color: 'var(--primary)',
                }}
              >
                <p
                  style={{
                    margin: '0 0 0.25rem 0',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Mail size={14} aria-hidden='true' /> Contact Information
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Mail size={13} aria-hidden='true' />
                  <a
                    href={`mailto:${request.student.email}`}
                    style={{ textDecoration: 'underline' }}
                  >
                    {request.student.email}
                  </a>
                </p>
                <p
                  style={{
                    margin: '0.25rem 0 0 0',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Phone size={13} aria-hidden='true' />
                  <a
                    href={`tel:${request.student.contact}`}
                    style={{ textDecoration: 'underline' }}
                  >
                    {request.student.contact}
                  </a>
                </p>
              </div>
            ) : request.status === 'MATCHED' ? (
              <div
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Lock size={14} aria-hidden='true' /> Contact details will be
                visible after the student&apos;s payment is verified.
              </div>
            ) : request.status === 'PAYMENT_PENDING' ? (
              <div
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.9rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <Clock size={14} aria-hidden='true' /> Contact details will be
                visible once the admin verifies the payment.
              </div>
            ) : null}
          </div>

          {/* Post-session: the review this student left for this session */}
          {request.status === 'COMPLETED' && request.rating != null && (
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                padding: '1rem',
                background: 'var(--surface-1)',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem' }}>
                Student Review
              </h4>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  color: '#fbbf24',
                }}
                aria-label={`${request.rating} out of 5 stars`}
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={16}
                    aria-hidden='true'
                    fill={star <= request.rating! ? 'currentColor' : 'none'}
                  />
                ))}
                <span
                  style={{
                    marginLeft: '0.35rem',
                    color: 'var(--text-main)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                  }}
                >
                  {request.rating}/5
                </span>
              </div>
              {request.review && (
                <p
                  style={{
                    margin: '0.5rem 0 0 0',
                    fontSize: '0.9rem',
                    color: 'var(--text-main)',
                  }}
                >
                  &ldquo;{request.review}&rdquo;
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
