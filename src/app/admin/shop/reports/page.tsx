import { Flag } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import AdminReportActions from '@/components/shop/AdminReportActions';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: 'warning',
  ACKNOWLEDGED: 'info',
  ACTIONED: 'success',
  DISMISSED: 'neutral',
};

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: 'var(--space-3)',
  fontSize: 'var(--text-xs)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: 600,
  borderBottom: '1px solid var(--border-color)',
};

const td: React.CSSProperties = {
  padding: 'var(--space-3)',
  verticalAlign: 'middle',
  fontSize: 'var(--text-sm)',
};

export default async function AdminShopReportsPage() {
  const reports = await prisma.shopReport.findMany({
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 100,
    select: {
      id: true,
      reason: true,
      detail: true,
      status: true,
      createdAt: true,
      reporter: { select: { name: true } },
      listing: { select: { id: true, title: true, status: true } },
    },
  });

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Reports'
        subtitle='Moderation queue for reported listings.'
        icon={<Flag size={18} aria-hidden='true' />}
      />
      {reports.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--space-4)' }}>
          No reports filed. 🎉
        </p>
      ) : (
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)' }}>
                <th style={th}>Listing</th>
                <th style={th}>Reason</th>
                <th style={th}>Detail</th>
                <th style={th}>Reporter</th>
                <th style={th}>Status</th>
                <th style={th}>Date</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={td}>
                    {r.listing ? (
                      <a
                        href={`/shop/listing/${r.listing.id}`}
                        style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'none' }}
                      >
                        {r.listing.title}
                      </a>
                    ) : (
                      <em>listing removed</em>
                    )}
                  </td>
                  <td style={{ ...td, fontSize: 'var(--text-xs)' }}>{r.reason.replace(/_/g, ' ').toLowerCase()}</td>
                  <td style={{ ...td, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {r.detail}
                  </td>
                  <td style={td}>{r.reporter.name}</td>
                  <td style={td}>
                    <Badge tone={STATUS_TONE[r.status] ?? 'neutral'}>
                      {r.status.replace(/_/g, ' ').toLowerCase()}
                    </Badge>
                  </td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td style={td}>
                    <AdminReportActions reportId={r.id} status={r.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
