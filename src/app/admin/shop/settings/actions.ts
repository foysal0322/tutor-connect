'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseFormData } from '@/lib/validation';
import { z } from 'zod';
import { clampCommissionRate } from '@/lib/shop/service';

type Result = { ok: true } | { ok: false; error: string };

const schema = z.object({
  shopCommissionRateDefault: z.coerce
    .number()
    .min(0)
    .max(20, 'Commission must be 0–20%.')
    .transform((v) => clampCommissionRate(v / 100)),
  shopAutoFinalizeHours: z.coerce.number().int().min(1).max(720),
  shopDisputeWindowHours: z.coerce.number().int().min(1).max(720),
  shopListingMaxImages: z.coerce.number().int().min(1).max(20),
  shopBoostFeeBdt: z.coerce.number().min(0).max(10000),
  shopBoostDays: z.coerce.number().int().min(1).max(90),
  shopModerationMode: z.enum(['AUTO', 'MANUAL']),
  shopMinPriceBdt: z.coerce.number().min(0).max(10000),
  shopMaxPriceBdt: z.coerce.number().min(1).max(1_000_000),
  shopMaxActiveListingsPerSeller: z.coerce.number().int().min(1).max(1000),
});

export async function updateShopSettings(formData: FormData): Promise<Result> {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return { ok: false, error: 'Admins only.' };
  }
  const parsed = parseFormData(formData, schema);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await prisma.platformSetting.upsert({
      where: { id: 'default' },
      update: parsed.data,
      create: { id: 'default', ...parsed.data },
    });
    revalidatePath('/admin/shop/settings');
    revalidatePath('/shop');
    revalidatePath('/shop/selling');
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Failed to save settings.',
    };
  }
}
