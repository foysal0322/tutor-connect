import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  PREFERENCE_CHANNELS,
  isCategoryLocked,
} from '@/lib/notifications/preferences';

// ──────────────────────────────────────────────────────────────────────────
// /api/notifications/preferences
//
// Phase 10: read + update the per-user × per-category × per-channel matrix.
// Auth-required; every row is scoped to the authenticated user. Defaults
// (no stored row) are surfaced as all-true so the UI can render a complete
// matrix on first visit.
//
// GET returns:
//   {
//     categories: Array<{
//       category: string,
//       locked: boolean,            // AUTH/SECURITY — non-mutable
//       channelInApp, channelEmail, channelPush: boolean
//     }>,
//     channels: ["IN_APP","EMAIL","PUSH"]   // mutable channels minus IN_APP
//   }
//
// PUT body:
//   { preferences: Array<{ category, channelEmail, channelPush }> }
// (channelInApp is intentionally NOT accepted — IN_APP is always on. The
// column exists in the schema for forward compatibility but is never
// mutated through this endpoint. See preferences.ts NON_MUTABLE_CHANNEL.)
// ──────────────────────────────────────────────────────────────────────────

// Categories surfaced in the preferences UI. Order is deliberate — high-
// signal categories first. Excludes ADMIN/ANNOUNCEMENT which are system-only
// recipients (admins) — those don't belong in a user-facing mute matrix.
const VISIBLE_CATEGORIES = [
  'TUTOR_REQUEST',
  'BOOKING',
  'PAYMENT',
  'WALLET',
  'WITHDRAWAL',
  'REFUND',
  'CONSULTANCY',
  'SUPPORT',
  'COURSE',
  'SYSTEM',
  'AUTH',
  'SECURITY',
];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const rows = await prisma.notificationPreference.findMany({
      where: { userId },
      select: {
        category: true,
        channelInApp: true,
        channelEmail: true,
        channelPush: true,
      },
    });
    const stored = new Map(rows.map((r) => [r.category, r]));

    const categories = VISIBLE_CATEGORIES.map((category) => {
      const row = stored.get(category);
      const locked = isCategoryLocked(category);
      return {
        category,
        locked,
        // IN_APP is always true (non-mutable channel). When a stored row
        // exists we still surface the column for completeness but force it
        // true so the UI never shows a stale "off" state.
        channelInApp: true,
        channelEmail: row?.channelEmail ?? true,
        channelPush: row?.channelPush ?? true,
      };
    });

    return NextResponse.json({
      categories,
      // Channels the user is allowed to toggle. IN_APP is included in the
      // response so the UI can render the column header, but is annotated
      // as non-mutable in the matrix.
      channels: PREFERENCE_CHANNELS,
      mutableChannels: ['EMAIL', 'PUSH'],
    });
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json().catch(() => null);

    if (!body || !Array.isArray(body.preferences)) {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    // Validate every entry. Reject attempts to:
    //   - mutate a locked category (AUTH/SECURITY) — silent no-op for safety
    //   - supply a non-boolean for email/push
    //   - inject unknown categories (filtered against VISIBLE_CATEGORIES)
    const allowed = new Set(VISIBLE_CATEGORIES);
    const cleaned: Array<{
      category: string;
      channelEmail: boolean;
      channelPush: boolean;
    }> = [];

    for (const entry of body.preferences) {
      if (!entry || typeof entry !== 'object') continue;
      const category = String(entry.category ?? '');
      if (!allowed.has(category)) continue;
      if (isCategoryLocked(category)) continue; // never persist locked rows
      const channelEmail = Boolean(entry.channelEmail);
      const channelPush = Boolean(entry.channelPush);
      cleaned.push({ category, channelEmail, channelPush });
    }

    if (cleaned.length === 0) {
      return NextResponse.json({ success: true, updated: 0 });
    }

    // Upsert each preference row. We don't use createMany+updateMany because
    // the unique constraint is (userId, category) — Prisma's upsert is the
    // clean primitive. The number of rows is bounded by the number of
    // visible categories (~12), so sequential upserts are fine.
    await Promise.all(
      cleaned.map((entry) =>
        prisma.notificationPreference.upsert({
          where: {
            userId_category: { userId, category: entry.category },
          },
          update: {
            channelEmail: entry.channelEmail,
            channelPush: entry.channelPush,
            channelInApp: true, // always re-assert
          },
          create: {
            userId,
            category: entry.category,
            channelInApp: true,
            channelEmail: entry.channelEmail,
            channelPush: entry.channelPush,
          },
        }),
      ),
    );

    return NextResponse.json({ success: true, updated: cleaned.length });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
