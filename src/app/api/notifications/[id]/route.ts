import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// DELETE /api/notifications/[id]
//
// Phase 8: soft-archive a single notification. Rows are not hard-deleted — we
// flip `archived: true` so the user's inbox stays clean but the audit trail
// (and any delivery receipts) remains. Ownership-checked the same way the
// existing read-marker route is, so a forged id cannot touch someone else's
// row. Archived rows are excluded from the bell's unread count (see
// /api/notifications/route.ts) so the badge decrements correctly.
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.userId !== (session.user as any).id) {
      return NextResponse.json({ error: 'Not Found or Unauthorized' }, { status: 404 });
    }

    await prisma.notification.update({
      where: { id },
      data: { archived: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error archiving notification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
