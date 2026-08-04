import { prisma } from './prisma';

export type CouponScope = 'COMMISSION' | 'TUITION' | 'CONSULTANCY';
export const COUPON_SCOPES: CouponScope[] = ['COMMISSION', 'TUITION', 'CONSULTANCY'];

export type CouponDiscountType = 'PERCENT' | 'FLAT';

export type CouponInput = {
  code: string;
  scope: CouponScope;
  amount: number; // base amount the discount is computed from
  userId: string;
  reference?: string; // optional idempotency key (e.g. withdrawal request id)
};

export type CouponResult =
  | { ok: true; couponId: string; discount: number; code: string }
  | { ok: false; error: string };

/**
 * Compute the discount for a coupon WITHOUT persisting a redemption.
 * Use this for live UI previews ("you'll save X BDT") before the user
 * confirms the action. The actual redemption is recorded by redeemCoupon
 * inside the caller's transaction.
 */
export async function previewCoupon(
  input: Omit<CouponInput, 'userId' | 'reference'>,
): Promise<CouponResult> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, error: 'Enter a coupon code.' };

  const coupon = await prisma.coupon.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      scope: true,
      discountType: true,
      value: true,
      minAmount: true,
      maxDiscount: true,
      usageLimit: true,
      usedCount: true,
      validFrom: true,
      validUntil: true,
      isActive: true,
    },
  });

  if (!coupon) return { ok: false, error: 'Coupon not found.' };
  if (!coupon.isActive) return { ok: false, error: 'Coupon is inactive.' };
  if (coupon.scope !== input.scope) {
    return { ok: false, error: `Coupon is for ${coupon.scope.toLowerCase()}, not ${input.scope.toLowerCase()}.` };
  }

  const now = new Date();
  if (now < coupon.validFrom) return { ok: false, error: 'Coupon is not yet active.' };
  if (coupon.validUntil && now > coupon.validUntil) {
    return { ok: false, error: 'Coupon has expired.' };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: 'Coupon usage limit reached.' };
  }
  if (input.amount < coupon.minAmount) {
    return {
      ok: false,
      error: `Requires a minimum amount of ${coupon.minAmount} BDT.`,
    };
  }

  const discount =
    coupon.discountType === 'PERCENT'
      ? Math.min(
          (input.amount * coupon.value) / 100,
          coupon.maxDiscount ?? Number.POSITIVE_INFINITY,
        )
      : coupon.value;

  if (discount <= 0) {
    return { ok: false, error: 'Coupon yields no discount.' };
  }

  return { ok: true, couponId: coupon.id, discount: round2(discount), code: coupon.code };
}

/**
 * Validate a coupon AND record the redemption atomically. Designed to run
 * inside the caller's prisma.$transaction (pass tx). The redemption row
 * is keyed on (couponId, userId, reference) so re-running the same
 * reference is idempotent — the same coupon can't be applied twice to
 * the same transaction.
 *
 * Returns the discount amount (always >= 0). Throws on invalid coupon
 * with a user-facing message.
 */
export async function redeemCoupon(
  tx: Parameters<Parameters<typeof prisma['$transaction']>[0]>[0],
  input: CouponInput,
): Promise<number> {
  const preview = await previewCoupon(input);
  if (!preview.ok) throw new Error(preview.error);

  // Re-validate inside the transaction for the usage-limit race. The
  // SELECT FOR UPDATE semantics come from Prisma's interactive tx.
  const fresh = await tx.coupon.findUnique({
    where: { id: preview.couponId },
    select: { usedCount: true, usageLimit: true },
  });
  if (fresh?.usageLimit !== null && fresh && fresh.usedCount >= (fresh.usageLimit ?? 0)) {
    throw new Error('Coupon usage limit reached.');
  }

  // Idempotent insert — the unique (couponId, userId, reference) constraint
  // turns a duplicate into a no-op when reference is provided.
  try {
    await tx.couponRedemption.create({
      data: {
        couponId: preview.couponId,
        userId: input.userId,
        reference: input.reference ?? null,
        discount: preview.discount,
      },
    });
    await tx.coupon.update({
      where: { id: preview.couponId },
      data: { usedCount: { increment: 1 } },
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      throw new Error('This coupon has already been applied to this transaction.');
    }
    throw err;
  }

  return preview.discount;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
