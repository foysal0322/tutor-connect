import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications
//
// Phase 8: extended with optional cursor pagination + category/type/archived
// filters. The original contract (no query params) is preserved verbatim —
// `limit` defaults to 50, response shape `{ notifications, unreadCount }` is
// unchanged when no pagination params are supplied. New callers (the
// Notification Center) opt into cursor mode by passing `cursor`.
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 100);
    const cursor = searchParams.get('cursor') || undefined;
    const category = searchParams.get('category') || undefined;
    const type = searchParams.get('type') || undefined;
    const archived = searchParams.get('archived');

    // Build the where clause. Every clause is scoped by userId so a malicious
    // or accidental param can never leak another user's rows.
    const where: any = { userId };
    if (category) where.category = category;
    if (type) where.type = type;
    if (archived === 'true') where.archived = true;
    else if (archived === 'false') where.archived = false;

    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // peek one extra to detect next-page availability
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = items.length > limit;
    const notifications = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? notifications[notifications.length - 1].id : null;

    // unreadCount follows the original semantics: total unread across all
    // categories (NOT scoped by filter — the badge reflects the user's whole
    // inbox). archived rows are excluded from the unread count so the badge
    // drops once something is archived.
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false, archived: false },
    });

    return NextResponse.json({ notifications, unreadCount, nextCursor });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
