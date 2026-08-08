/**
 * Order data-access helpers — read-side queries for the buyer/seller order
 * views. Centralised for the same reasons as queries.ts.
 */

import { prisma } from '@/lib/prisma';

const ORDER_LIST_SELECT = {
  id: true,
  status: true,
  quantity: true,
  unitPriceBdt: true,
  subtotalBdt: true,
  payoutBdt: true,
  commissionBdt: true,
  createdAt: true,
  updatedAt: true,
  shippedAt: true,
  deliveredAt: true,
  completedAt: true,
  listingSnapshot: true,
  buyer: { select: { id: true, name: true } },
  seller: { select: { id: true, name: true } },
  listing: { select: { id: true, title: true, status: true } },
} as const;

const ORDER_DETAIL_SELECT = {
  ...ORDER_LIST_SELECT,
  disputeWindowEndsAt: true,
  autoFinalizeAt: true,
  escrowTxId: true,
  payoutTxId: true,
  commissionTxId: true,
  refundTxId: true,
  events: {
    orderBy: { createdAt: 'asc' as const },
    select: { id: true, type: true, actorId: true, note: true, metadata: true, createdAt: true },
  },
} as const;

export interface OrderListFilters {
  role: 'buyer' | 'seller';
  userId: string;
  status?: string;
}

/** List orders where the user is the buyer or seller. */
export async function listOrdersForUser(filters: OrderListFilters) {
  const where = {
    ...(filters.role === 'buyer' ? { buyerId: filters.userId } : { sellerId: filters.userId }),
    ...(filters.status && filters.status !== 'all' ? { status: filters.status } : {}),
  };
  return prisma.shopOrder.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 100,
    select: ORDER_LIST_SELECT,
  });
}

/** Get a single order with events timeline. */
export async function getOrderForUser(orderId: string, userId: string) {
  // Buyer OR seller can see the order.
  return prisma.shopOrder.findFirst({
    where: {
      id: orderId,
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: ORDER_DETAIL_SELECT,
  });
}

/** Aggregate counts for the orders-page tabs. */
export async function getOrderCounts(userId: string) {
  const [buying, selling] = await Promise.all([
    prisma.shopOrder.groupBy({
      by: ['status'],
      where: { buyerId: userId },
      _count: { _all: true },
    }),
    prisma.shopOrder.groupBy({
      by: ['status'],
      where: { sellerId: userId },
      _count: { _all: true },
    }),
  ]);
  return { buying, selling };
}
