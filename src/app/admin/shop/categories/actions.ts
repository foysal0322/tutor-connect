'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseFormData, nonEmpty } from '@/lib/validation';
import { z } from 'zod';
import { clampCommissionRate } from '@/lib/shop/service';

type Result = { ok: true; id?: string } | { ok: false; error: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const schema = z.object({
  id: z.string().optional().or(z.literal('')),
  name: nonEmpty('Name', 80),
  slug: nonEmpty('Slug', 80).transform((s) => slugify(s)),
  description: z.string().trim().max(500, 'Description too long.').optional().or(z.literal('')),
  icon: z.string().trim().max(60).optional().or(z.literal('')),
  commissionRateOverride: z
    .string()
    .optional()
    .or(z.literal(''))
    .transform((v) => {
      if (!v) return null;
      const n = Number(v);
      // Allow percent input (0–20) → fraction.
      if (!Number.isFinite(n)) return null;
      return clampCommissionRate(n / 100);
    }),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.enum(['true', 'false']).transform((v) => v === 'true'),
});

export async function saveCategory(formData: FormData): Promise<Result> {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return { ok: false, error: 'Admins only.' };
  }
  const parsed = parseFormData(formData, schema);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const d = parsed.data;

  try {
    if (d.id) {
      await prisma.shopCategory.update({
        where: { id: d.id },
        data: {
          name: d.name,
          slug: d.slug,
          description: d.description || null,
          icon: d.icon || null,
          commissionRateOverride: d.commissionRateOverride,
          sortOrder: d.sortOrder,
          isActive: d.isActive,
        },
      });
      revalidatePath('/admin/shop/categories');
      revalidatePath('/shop');
      revalidatePath(`/shop/category/${d.slug}`);
      return { ok: true, id: d.id };
    }
    const created = await prisma.shopCategory.create({
      data: {
        name: d.name,
        slug: d.slug,
        description: d.description || null,
        icon: d.icon || null,
        commissionRateOverride: d.commissionRateOverride,
        sortOrder: d.sortOrder,
        isActive: d.isActive,
      },
    });
    revalidatePath('/admin/shop/categories');
    revalidatePath('/shop');
    return { ok: true, id: created.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error && err.message.includes('Unique')
        ? 'That slug is already used.'
        : 'Failed to save category.',
    };
  }
}

const deleteSchema = z.object({ id: nonEmpty('ID', 100) });

export async function deleteCategory(formData: FormData): Promise<Result> {
  const session = await getServerSession(authOptions);
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return { ok: false, error: 'Admins only.' };
  }
  const parsed = parseFormData(formData, deleteSchema);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  try {
    await prisma.shopCategory.delete({ where: { id: parsed.data.id } });
    revalidatePath('/admin/shop/categories');
    revalidatePath('/shop');
    return { ok: true };
  } catch {
    return {
      ok: false,
      error: 'Cannot delete — listings reference this category. Reassign or deactivate instead.',
    };
  }
}
