import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications/unread-count
//
// Phase 8: cheap badge-only endpoint. Returns just `{ unreadCount }` — no list
// payload. The Notification Center uses this for periodic refresh; the bell
// uses it as a fallback when no other transport is available. Indexed by
// (userId, isRead, createdAt) so it's a fast count even at scale.
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const unreadCount = await prisma.notification.count({
      where: {
        userId: (session.user as any).id,
        isRead: false,
        archived: false,
      },
    });

    return NextResponse.json(
      { unreadCount },
      {
        headers: {
          // Phase 12: short-TTL browser cache so the bell's periodic badge
          // refreshes coalesce. `private` because the response is user-
          // scoped; `max-age=5` matches the client-side dedupe window so a
          // burst of polling (multiple tabs, focus events) collapses to one
          // round trip. Stale-while-revalidate softens the worst case.
          'Cache-Control': 'private, max-age=5, stale-while-revalidate=15',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
