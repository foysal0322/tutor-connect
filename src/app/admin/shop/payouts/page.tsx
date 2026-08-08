import { DollarSign } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { KPI } from '@/components/ui/KPI';
import { formatBDT, formatBDTCompact } from '@/lib/shop/service';

export const dynamic = 'force-dynamic';

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

export default async function AdminShopPayoutsPage() {
  const [allTxns, totals] = await Promise.all([
    prisma.walletTransaction.findMany({
      where: {
        type: { in: ['SHOP_PAYOUT', 'SHOP_COMMISSION', 'SHOP_ESCROW', 'SHOP_REFUND'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        userId: true,
        amount: true,
        type: true,
        description: true,
        referenceId: true,
        createdAt: true,
        user: { select: { name: true, role: true } },
      },
    }),
    prisma.walletTransaction.aggregate({
      where: { type: 'SHOP_COMMISSION' },
      _sum: { amount: true },
    }),
  ]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title='Payouts & Ledger'
        subtitle='All Shop-related wallet transactions.'
        icon={<DollarSign size={18} aria-hidden='true' />}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))',
          gap: 'var(--space-3)',
          marginBottom: 'var(--space-4)',
        }}
      >
        <KPI label='Total commission' value={formatBDTCompact(totals._sum.amount ?? 0)} tone='success' icon={<DollarSign size={18} />} />
        <KPI label='Ledger rows' value={String(allTxns.length)} tone='info' />
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ background: 'var(--surface-2)' }}>
              <th style={th}>Type</th>
              <th style={th}>User</th>
              <th style={th}>Amount</th>
              <th style={th}>Description</th>
              <th style={th}>Order</th>
              <th style={th}>Date</th>
            </tr>
          </thead>
          <tbody>
            {allTxns.map((t) => {
              const isCredit = t.amount >= 0;
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={td}>{t.type.replace(/_/g, ' ').toLowerCase()}</td>
                  <td style={td}>
                    {t.user.name}
                    {t.user.role === 'ADMIN' && (
                      <span style={{ marginLeft: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>(platform)</span>
                    )}
                  </td>
                  <td style={{
                    ...td,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                    color: isCredit ? 'var(--success)' : 'var(--text-main)',
                  }}>
                    {isCredit ? '+' : ''}{formatBDT(Math.abs(t.amount))}
                  </td>
                  <td style={{ ...td, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{t.description}</td>
                  <td style={{ ...td, fontSize: 'var(--text-xs)' }}>
                    {t.referenceId ? (
                      <a href={`/shop/orders/${t.referenceId}`} style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                        view
                      </a>
                    ) : '—'}
                  </td>
                  <td style={{ ...td, color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    {new Date(t.createdAt).toLocaleString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
