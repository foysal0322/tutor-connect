import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const subscription = await req.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
    }

    const existingSub = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
    });

    if (!existingSub) {
      await prisma.pushSubscription.create({
        data: {
          userId: (session.user as any).id,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
    } else if (existingSub.userId !== (session.user as any).id) {
        // If same endpoint but different user, update the user
        await prisma.pushSubscription.update({
            where: { endpoint: subscription.endpoint },
            data: { userId: (session.user as any).id }
        })
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
