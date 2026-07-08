import webpush from 'web-push';
import { prisma } from './prisma';

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:support@campusbridge.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string
);

export async function createNotification(
  userId: string,
  title: string,
  message: string,
  actionUrl?: string
) {
  // 1. Create the in-app notification record in DB
  const notification = await prisma.notification.create({
    data: {
      userId,
      title,
      message,
      actionUrl,
    },
  });

  // 2. Fetch user's push subscriptions
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  // 3. Send web push to all user's registered devices
  if (subscriptions.length > 0) {
    const payload = JSON.stringify({
      title,
      body: message,
      url: actionUrl || '/',
    });

    const pushPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
      } catch (error: any) {
        // If subscription is invalid/expired (status 410 or 404), remove it from DB
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } });
        } else {
          console.error('Error sending push notification:', error);
        }
      }
    });

    await Promise.all(pushPromises);
  }

  return notification;
}
