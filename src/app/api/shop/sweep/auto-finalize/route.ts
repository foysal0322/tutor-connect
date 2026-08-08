import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  buildCommissionCreditTx,
  buildPayoutCreditTx,
} from '@/lib/shop/escrow';

/**
 * POST /api/shop/sweep/auto-finalize
 *
 * Idempotent sweep that transitions DELIVERED orders past their
 * autoFinalizeAt timestamp (and not under dispute) to COMPLETED, releasing
 * the seller payout + capturing platform commission.
 *
 * Auth: bearer token matching env SHOP_CRON_SECRET (or CRON_SECRET as
 * fallback). Called by any external scheduler (Vercel Cron, GitHub Actions,
 * laptop cron). Safe to call as often as desired.
 *
 * Returns: { processed, skipped, errors }
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const secret = process.env.SHOP_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    // Find candidates: DELIVERED, past autoFinalizeAt, no open dispute.
    const candidates = await prisma.shopOrder.findMany({
      where: {
        status: 'DELIVERED',
        autoFinalizeAt: { lt: now },
        dispute: null,
      },
      select: {
        id: true,
        buyerId: true,
        sellerId: true,
        subtotalBdt: true,
        payoutBdt: true,
        commissionBdt: true,
        listing: { select: { id: true, title: true } },
      },
      take: 50, // batch cap; run again if more remain
    });

    let processed = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const order of candidates) {
      try {
        await prisma.$transaction(async (tx) => {
          // Re-read inside the tx to catch concurrent state changes.
          const fresh = await tx.shopOrder.findUnique({
            where: { id: order.id },
            select: { id: true, status: true, payoutTxId: true },
          });
          if (!fresh || fresh.status !== 'DELIVERED' || fresh.payoutTxId) {
            skipped++;
            return;
          }

          // Resolve platform wallet for commission.
          const platformAdmin = await tx.user.findFirst({
            where: { role: 'ADMIN' },
            orderBy: { createdAt: 'asc' },
            select: { id: true },
          });
          const platformId = platformAdmin?.id ?? 'platform';

          const payoutTx = await tx.walletTransaction.create({
            data: buildPayoutCreditTx({
              sellerId: order.sellerId,
              orderId: order.id,
              payoutBdt: order.payoutBdt,
              listingTitle: order.listing.title,
            }),
          });
          const commissionTx = await tx.walletTransaction.create({
            data: buildCommissionCreditTx({
              platformUserId: platformId,
              orderId: order.id,
              commissionBdt: order.commissionBdt,
            }),
          });
          await tx.user.update({
            where: { id: order.sellerId },
            data: { balance: { increment: order.payoutBdt } },
          });
          if (platformId !== 'platform') {
            await tx.user.update({
              where: { id: platformId },
              data: { balance: { increment: order.commissionBdt } },
            });
          }
          await tx.shopOrder.update({
            where: { id: order.id },
            data: {
              status: 'COMPLETED',
              completedAt: now,
              payoutTxId: payoutTx.id,
              commissionTxId: commissionTx.id,
            },
          });
          await tx.shopOrderEvent.createMany({
            data: [
              {
                orderId: order.id,
                type: 'COMMISSION_CAPTURED',
                metadata: { commissionBdt: order.commissionBdt, commissionTxId: commissionTx.id },
              },
              {
                orderId: order.id,
                type: 'PAYOUT_RELEASED',
                metadata: { payoutBdt: order.payoutBdt, payoutTxId: payoutTx.id },
              },
              {
                orderId: order.id,
                type: 'COMPLETED',
                note: 'Auto-finalized (no dispute within window).',
              },
            ],
          });
          await tx.shopSellerProfile.upsert({
            where: { userId: order.sellerId },
            update: { completedSales: { increment: 1 } },
            create: { userId: order.sellerId, completedSales: 1 },
          });
          processed++;
        });
      } catch (err) {
        errors.push(
          `${order.id}: ${err instanceof Error ? err.message : 'unknown error'}`,
        );
      }
    }

    return NextResponse.json({
      processed,
      skipped,
      errors,
      checkedAt: now.toISOString(),
    });
  } catch (err) {
    console.error('[shop.sweep] auto-finalize failed:', err);
    return NextResponse.json(
      { error: 'Sweep failed.', detail: err instanceof Error ? err.message : undefined },
      { status: 500 },
    );
  }
}

/** GET endpoint for health check / manual trigger from a browser. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: 'Shop auto-finalize sweep endpoint. POST with Authorization: Bearer <SHOP_CRON_SECRET>.',
  });
}
