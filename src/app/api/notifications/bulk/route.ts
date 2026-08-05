import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/notifications/bulk
//
// Phase 8: bulk operation endpoint. Body:
//   {
//     ids?: string[],            // explicit IDs (when selected from the UI)
//     filter?: {                 // OR implicit filter (apply to whole inbox)
//       category?: string,
//       type?: string,
//       archived?: boolean,
//       read?: boolean,          // false = only unread, true = only read
//     },
//     action: 'mark_read' | 'archive' | 'unarchive'
//   }
//
// Exactly one of `ids` or `filter` must be supplied. All operations are
// scoped to the authenticated user — `ids` are intersected with userId, so
// foreign IDs silently no-op rather than throw.
//
// Returns `{ updated }` — the count of rows affected.
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== 'object' || typeof body.action !== 'string') {
      return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
    }

    const { ids, filter, action } = body as {
      ids?: string[];
      filter?: {
        category?: string;
        type?: string;
        archived?: boolean;
        read?: boolean;
      };
      action: 'mark_read' | 'archive' | 'unarchive';
    };

    if (!['mark_read', 'archive', 'unarchive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action.' }, { status: 400 });
    }

    const hasIds = Array.isArray(ids) && ids.length > 0;
    const hasFilter = filter && Object.keys(filter).length > 0;
    if (!hasIds && !hasFilter) {
      return NextResponse.json(
        { error: 'Supply either ids[] or a filter.' },
        { status: 400 },
      );
    }

    // Build a where clause that's ALWAYS scoped by userId.
    const where: any = { userId };
    if (hasIds) {
      where.id = { in: ids };
    }
    if (filter?.category) where.category = filter.category;
    if (filter?.type) where.type = filter.type;
    if (filter?.archived !== undefined) where.archived = filter.archived;
    if (filter?.read === false) where.isRead = false;
    if (filter?.read === true) where.isRead = true;

    let data: any;
    if (action === 'mark_read') {
      data = { isRead: true, readAt: new Date() };
    } else if (action === 'archive') {
      data = { archived: true };
    } else {
      data = { archived: false };
    }

    const result = await prisma.notification.updateMany({ where, data });

    return NextResponse.json({ success: true, updated: result.count });
  } catch (error) {
    console.error('Error in bulk notification operation:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
