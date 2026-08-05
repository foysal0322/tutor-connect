import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/notifications/stream
//
// Phase 9: Server-Sent Events endpoint for sub-second badge updates without
// requiring OS-level Web Push opt-in. Authenticated; pushes events ONLY for
// the owning user.
//
// Transport design (see blueprint §XII):
//   - EventStream over a long-lived HTTP connection (one per client tab).
//   - The producer polls the DB for the user's latest notifications on a
//     short interval (10s) and pushes any rows newer than the last seen
//     createdAt. Polling-inside-SSE is the documented baseline until a
//     Postgres LISTEN/NOTIFY layer is introduced.
//   - The client treats SSE as the preferred transport and falls back to
//     Web Push, then to 30s polling — see useNotificationStream.
//
// Safety:
//   - 401 unauth → no stream.
//   - Client disconnect (AbortController) closes the stream and the polling
//     loop is cleaned up.
//   - Heartbeat every 25s to keep proxies / load balancers from reaping the
//     idle connection (Next.js dev/prod servers and most CDNs otherwise
//     time out at 30-60s).
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const encoder = new TextEncoder();

  // Send an event with the standard `event:` / `data:` framing per the SSE
  // spec. A trailing blank line delimits events.
  const send = (
    controller: ReadableStreamDefaultController,
    event: string,
    payload: unknown,
  ) => {
    const lines = [
      `event: ${event}`,
      `data: ${JSON.stringify(payload)}`,
      '',
      '',
    ];
    controller.enqueue(encoder.encode(lines.join('\n')));
  };

  const stream = new ReadableStream({
    start: async (controller) => {
      let closed = false;
      let lastSeenAt: Date | null = null;
      let pollTimer: ReturnType<typeof setInterval> | null = null;
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

      const cleanup = () => {
        if (closed) return;
        closed = true;
        if (pollTimer) clearInterval(pollTimer);
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Honor client-side abort (tab close, navigation, hook teardown).
      req.signal.addEventListener('abort', cleanup);

      // Initial hello so the client knows the stream is alive and can show
      // the right transport state. We also send the current unread count so
      // the bell badge settles immediately on connect.
      try {
        const initialCount = await prisma.notification.count({
          where: { userId, isRead: false, archived: false },
        });
        send(controller, 'ready', { unreadCount: initialCount });
      } catch {
        // If the initial count fails, still announce readiness; the bell
        // already has a baseline from its GET /api/notifications call.
        send(controller, 'ready', { unreadCount: 0 });
      }

      // Polling producer: every 10s, look for rows newer than the last one
      // we shipped. First iteration uses no `lastSeenAt` so we capture the
      // baseline of the inbox; subsequent iterations push deltas only.
      const poll = async () => {
        if (closed) return;
        try {
          const rows = await prisma.notification.findMany({
            where: {
              userId,
              archived: false,
              ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
            select: {
              id: true,
              title: true,
              message: true,
              actionUrl: true,
              type: true,
              category: true,
              priority: true,
              isRead: true,
              createdAt: true,
            },
          });

          if (rows.length > 0) {
            // Newest first ships the highest createdAt so subsequent polls
            // start from there.
            for (const row of rows) {
              send(controller, 'notification', row);
            }
            const newest = rows[0].createdAt;
            if (!lastSeenAt || newest > lastSeenAt) {
              lastSeenAt = newest;
            }
          } else if (!lastSeenAt) {
            // No rows at all — anchor lastSeenAt to now so we only push rows
            // that arrive AFTER the connection was established.
            lastSeenAt = new Date();
          }

          // Always recompute and push the live unread count so the bell
          // stays in sync even if the user reads from another tab/device.
          const unreadCount = await prisma.notification.count({
            where: { userId, isRead: false, archived: false },
          });
          send(controller, 'unread', { unreadCount });
        } catch (err) {
          // Transient DB hiccup — log and send an error hint; client decides
          // whether to fall back. Keep the stream alive.
          console.error('[notifications/stream] poll error:', err);
          send(controller, 'error', { message: 'poll_failed' });
        }
      };

      void poll();
      pollTimer = setInterval(() => void poll(), 10_000);

      // Heartbeat: empty comment line every 25s to keep proxies from reaping
      // the connection. Doesn't trigger any client event handler.
      heartbeatTimer = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(': heartbeat\n\n'));
        } catch {
          cleanup();
        }
      }, 25_000);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable Next.js buffering for streaming responses.
      'X-Accel-Buffering': 'no',
    },
  });
}
