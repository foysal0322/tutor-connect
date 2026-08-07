/**
 * Shop data-access helpers — single place where Prisma is queried for shop
 * browse + seller flows. Server-only. Each function is read-only and does
 * not mutate.
 *
 * Selects are inlined (rather than shared as a const) because Prisma's
 * TypeScript inference only narrows the return type when the select shape
 * is a literal in the call. The `ShopListingPublic` type below captures
 * the row shape so consumers stay typed without re-stating it.
 */

import { prisma } from '@/lib/prisma';
import type { ShopListingStatus } from './types';

/** The shape of a public listing row (used by ShopListingCard etc.). */
export interface ShopListingPublic {
  id: string;
  title: string;
  description: string;
  condition: string;
  priceBdt: number;
  quantity: number;
  status: string;
  location: string | null;
  images: unknown;
  viewCount: number;
  savedCount: number;
  soldCount: number;
  boostedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
  seller: {
    id: string;
    name: string;
    shopSellerProfile: {
      avgRating: number | null;
      completedSales: number;
      storefrontName: string | null;
    } | null;
  };
  category: { id: string; slug: string; name: string } | null;
}

/** Seller-facing listing row — adds sellerId (omitted from public shape). */
export interface SellerListing extends ShopListingPublic {
  sellerId: string;
}

export interface ShopBrowseFilters {
  q?: string;
  categorySlug?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price-asc' | 'price-desc' | 'popular';
  limit?: number;
  cursor?: string;
}

/** Apply filters to a Prisma where clause. */
function buildWhere(filters: ShopBrowseFilters) {
  const where: Record<string, unknown> = {
    status: 'ACTIVE' satisfies ShopListingStatus,
  };
  const and: Record<string, unknown>[] = [];

  if (filters.q && filters.q.trim()) {
    and.push({
      OR: [
        { title: { contains: filters.q.trim(), mode: 'insensitive' } },
        { description: { contains: filters.q.trim(), mode: 'insensitive' } },
      ],
    });
  }
  if (filters.categorySlug) {
    and.push({ category: { slug: filters.categorySlug } });
  }
  if (filters.condition) {
    and.push({ condition: filters.condition });
  }
  if (typeof filters.minPrice === 'number' && Number.isFinite(filters.minPrice)) {
    and.push({ priceBdt: { gte: filters.minPrice } });
  }
  if (typeof filters.maxPrice === 'number' && Number.isFinite(filters.maxPrice)) {
    and.push({ priceBdt: { lte: filters.maxPrice } });
  }
  if (and.length) where.AND = and;
  return where;
}

function buildOrderBy(sort: ShopBrowseFilters['sort']) {
  // Boosted listings pinned first; Phase 9 will refine into hard pinning.
  const primary = { boostedUntil: 'desc' as const };
  switch (sort) {
    case 'price-asc':
      return [primary, { priceBdt: 'asc' as const }];
    case 'price-desc':
      return [primary, { priceBdt: 'desc' as const }];
    case 'popular':
      return [primary, { viewCount: 'desc' as const, savedCount: 'desc' as const }];
    case 'newest':
    default:
      return [primary, { createdAt: 'desc' as const }];
  }
}

const PUBLIC_SELECT = {
  id: true,
  title: true,
  description: true,
  condition: true,
  priceBdt: true,
  quantity: true,
  status: true,
  location: true,
  images: true,
  viewCount: true,
  savedCount: true,
  soldCount: true,
  boostedUntil: true,
  createdAt: true,
  updatedAt: true,
  seller: {
    select: {
      id: true,
      name: true,
      shopSellerProfile: {
        select: { avgRating: true, completedSales: true, storefrontName: true },
      },
    },
  },
  category: { select: { id: true, slug: true, name: true } },
} as const;

/** List active listings with filters. */
export async function listShopListings(
  filters: ShopBrowseFilters = {},
): Promise<ShopListingPublic[]> {
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 60);
  const rows = filters.cursor
    ? await prisma.shopListing.findMany({
        where: buildWhere(filters),
        orderBy: buildOrderBy(filters.sort),
        take: limit + 1,
        select: PUBLIC_SELECT,
        cursor: { id: filters.cursor },
        skip: 1,
      })
    : await prisma.shopListing.findMany({
        where: buildWhere(filters),
        orderBy: buildOrderBy(filters.sort),
        take: limit + 1,
        select: PUBLIC_SELECT,
      });
  return rows as unknown as ShopListingPublic[];
}

/** Get a single listing by id, only if it's buyer-visible. */
export async function getShopListing(
  id: string,
): Promise<ShopListingPublic | null> {
  const row = await prisma.shopListing.findFirst({
    where: {
      id,
      status: { in: ['ACTIVE', 'PAUSED', 'SOLD'] },
    },
    select: PUBLIC_SELECT,
  });
  return row as unknown as ShopListingPublic | null;
}

/** Categories sorted for nav + filter dropdowns. */
export async function listShopCategories() {
  return prisma.shopCategory.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      description: true,
      _count: { select: { listings: { where: { status: 'ACTIVE' } } } },
    },
  });
}

/** Public storefront data for a seller. */
export async function getShopSeller(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      createdAt: true,
      shopSellerProfile: {
        select: {
          bio: true,
          storefrontName: true,
          listingCount: true,
          completedSales: true,
          avgRating: true,
          createdAt: true,
        },
      },
    },
  });
}

/** Listings by a specific seller (storefront view). */
export async function listShopListingsBySeller(
  userId: string,
  limit = 24,
): Promise<ShopListingPublic[]> {
  const rows = await prisma.shopListing.findMany({
    where: { sellerId: userId, status: 'ACTIVE' },
    orderBy: [{ boostedUntil: 'desc' }, { createdAt: 'desc' }],
    take: limit,
    select: PUBLIC_SELECT,
  });
  return rows as unknown as ShopListingPublic[];
}

/** Listings owned by the signed-in seller (any status). */
export async function listMyShopListings(
  sellerId: string,
  statusFilter?: ShopListingStatus[],
): Promise<SellerListing[]> {
  const rows = await prisma.shopListing.findMany({
    where: {
      sellerId,
      ...(statusFilter && statusFilter.length
        ? { status: { in: statusFilter } }
        : {}),
    },
    orderBy: [{ updatedAt: 'desc' }],
    select: { ...PUBLIC_SELECT, sellerId: true },
  });
  return rows as unknown as SellerListing[];
}

/** Stats for the seller dashboard. */
export async function getSellerDashboardStats(sellerId: string) {
  const [
    activeCount,
    draftCount,
    soldCount,
    reportedCount,
    views,
    completedSales,
    avgRating,
  ] = await Promise.all([
    prisma.shopListing.count({
      where: { sellerId, status: { in: ['ACTIVE', 'PAUSED', 'PENDING_REVIEW'] } },
    }),
    prisma.shopListing.count({ where: { sellerId, status: 'DRAFT' } }),
    prisma.shopListing.count({ where: { sellerId, status: 'SOLD' } }),
    prisma.shopReport.count({
      where: { listing: { sellerId }, status: 'OPEN' },
    }),
    prisma.shopListing.aggregate({
      where: { sellerId },
      _sum: { viewCount: true, savedCount: true },
    }),
    prisma.shopSellerProfile.findUnique({
      where: { userId: sellerId },
      select: { completedSales: true },
    }),
    prisma.shopSellerProfile.findUnique({
      where: { userId: sellerId },
      select: { avgRating: true },
    }),
  ]);

  return {
    activeCount,
    draftCount,
    soldCount,
    reportedCount,
    totalViews: views._sum.viewCount ?? 0,
    totalSaves: views._sum.savedCount ?? 0,
    completedSales: completedSales?.completedSales ?? 0,
    avgRating: avgRating?.avgRating ?? null,
  };
}

/** Get or lazily create a seller profile (idempotent). */
export async function ensureSellerProfile(userId: string) {
  return prisma.shopSellerProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
    select: { userId: true, isSuspended: true, bio: true, storefrontName: true },
  });
}
