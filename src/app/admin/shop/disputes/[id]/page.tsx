import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Scale } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import AdminDisputeResolver from '@/components/shop/AdminDisputeResolver';
import { formatBDT, disputeStatusLabel } from '@/lib/shop/service';

export const dynamic = 'force-dynamic';

const STATUS_TONE: Record<string, BadgeTone> = {
  OPEN: 'warning',
  AWAITING_SELLER: 'warning',
  AWAITING_BUYER: 'warning',
  RESOLVED_BUYER: 'success',
  RESOLVED_SELLER: 'success',
  ESCALATED: 'danger',
  CLOSED: 'neutral',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminDisputeDetailPage({ params }: PageProps) {
  const { id } = await params;
  const dispute = await prisma.shopDispute.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      reason: true,
      resolution: true,
      createdAt: true,
      resolvedAt: true,
      order: {
        select: {
          id: true,
          status: true,
          subtotalBdt: true,
          payoutBdt: true,
          commissionBdt: true,
          payoutTxId: true,
          refundTxId: true,
          buyerId: true,
          sellerId: true,
          buyer: { select: { id: true, name: true } },
          seller: { select: { id: true, name: true } },
          listing: { select: { id: true, title: true } },
          listingSnapshot: true,
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          body: true,
          createdAt: true,
          authorId: true,
        },
      },
    },
  });

  if (!dispute) notFound();

  const title =
    dispute.order.listing?.title ??
    (dispute.order.listingSnapshot as { title?: string })?.title ??
    'Item';
  const isOpen =
    dispute.status === 'OPEN' ||
    dispute.status === 'AWAITING_BUYER' ||
    dispute.status === 'AWAITING_SELLER';
  const sellerAlreadyPaid = !!dispute.order.payoutTxId;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 var(--space-4)' }}>
      <PageHeader
        title={
          <Link href='/admin/shop/disputes' style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'none', fontWeight: 500 }}>
            <ArrowLeft size={16} aria-hidden='true' /> Back to Issues
          </Link>
        }
        actions={<Badge tone={STATUS_TONE[dispute.status] ?? 'neutral'}>{disputeStatusLabel(dispute.status)}</Badge>}
      />

      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
        <h2 style={{ margin: '0 0 var(--space-2) 0', fontSize: 'var(--text-lg)' }}>{title}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Buyer</div>
            <div style={{ fontWeight: 600 }}>{dispute.order.buyer.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Seller</div>
            <div style={{ fontWeight: 600 }}>{dispute.order.seller.name}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Subtotal</div>
            <div style={{ fontWeight: 600 }}>{formatBDT(dispute.order.subtotalBdt)}</div>
          </div>
          <div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Seller paid?</div>
            <div style={{ fontWeight: 600, color: sellerAlreadyPaid ? 'var(--success)' : 'var(--text-muted)' }}>
              {sellerAlreadyPaid ? 'Yes — already settled' : 'No — still escrowed'}
            </div>
          </div>
        </div>
        <Link
          href={`/shop/orders/${dispute.order.id}`}
          style={{ display: 'inline-block', marginTop: 'var(--space-3)', color: 'var(--primary)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 600 }}
        >
          View full order →
        </Link>
      </div>

      <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, marginBottom: 'var(--space-2)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
        <Scale size={14} aria-hidden='true' /> Conversation
      </h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-4) 0', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        {dispute.messages.map((m) => {
          const authorRole =
            m.authorId === dispute.order.buyerId ? 'buyer' : m.authorId === dispute.order.sellerId ? 'seller' : 'admin';
          return (
            <li
              key={m.id}
              style={{
                padding: 'var(--space-2) var(--space-3)',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)',
              }}
            >
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 4 }}>
                <strong style={{ textTransform: 'capitalize' }}>{authorRole}</strong> · {new Date(m.createdAt).toLocaleString()}
              </div>
              <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.body}</div>
            </li>
          );
        })}
      </ul>

      {isOpen && (
        <AdminDisputeResolver
          disputeId={dispute.id}
          sellerAlreadyPaid={sellerAlreadyPaid}
        />
      )}

      {dispute.resolution && (
        <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--success)' }}>
          <div style={{ fontSize: 'var(--text-xs)', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Resolution</div>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)' }}>{dispute.resolution}</p>
        </div>
      )}
    </div>
  );
}
