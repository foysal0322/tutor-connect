import { prisma } from '@/lib/prisma';
import CouponManager from './CouponManager';

export const revalidate = 0;

export default async function AdminCouponsPage() {
  const [coupons, redemptionCounts] = await Promise.all([
    prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }),
    prisma.couponRedemption.groupBy({
      by: ['couponId'],
      _count: { _all: true },
    }),
  ]);

  const countByCoupon = new Map(
    redemptionCounts.map((r) => [r.couponId, r._count._all]),
  );

  const serialized = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    scope: c.scope,
    discountType: c.discountType,
    value: c.value,
    minAmount: c.minAmount,
    maxDiscount: c.maxDiscount,
    usageLimit: c.usageLimit,
    usedCount: c.usedCount,
    validFrom: c.validFrom.toISOString(),
    validUntil: c.validUntil ? c.validUntil.toISOString() : null,
    isActive: c.isActive,
    redemptions: countByCoupon.get(c.id) ?? 0,
    createdAt: c.createdAt.toISOString(),
  }));

  return (
    <div className="max-w-full">
      <h1 className="mb-2">Coupons</h1>
      <p className="text-muted mb-6">
        Discount codes for platform commission, tuition payments, or consultancy bookings.
      </p>
      <CouponManager coupons={serialized} />
    </div>
  );
}
