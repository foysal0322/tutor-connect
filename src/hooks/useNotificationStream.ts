"use client";

import { useEffect, useRef, useState } from "react";

// useNotificationStream — Phase 9 SSE client.
//
// Opens a long-lived EventSource connection to /api/notifications/stream and
// surfaces two signals to the caller:
//   - `connected`: whether the SSE transport is currently live.
//   - `onEvent`: callback fired whenever the server pushes a `notification`
//     event (a brand new Notification row) or an `unread` event (an updated
//     unread count, e.g. after the user read something in another tab).
//
// The hook is self-healing: on browser-level error it closes the connection
// and reports `connected: false`. The caller (NotificationBell) treats this
// as a signal to fall back to Web Push / polling.
//
// The hook is SSR-safe: it only opens a connection after mount. Tab
// visibility is respected — if the tab is hidden for an extended period,
// browsers throttle polling and may close the stream; on visibility regain
// the hook reconnects.

export type NotificationStreamEvent =
  | {
      kind: "notification";
      data: {
        id: string;
        title: string;
        message: string;
        actionUrl: string | null;
        type: string;
        category: string;
        priority: string;
        isRead: boolean;
        createdAt: string;
      };
    }
  | { kind: "unread"; data: { unreadCount: number } }
  | { kind: "ready"; data: { unreadCount: number } };

export interface UseNotificationStreamOptions {
  enabled?: boolean;
  onEvent?: (event: NotificationStreamEvent) => void;
}

export interface UseNotificationStreamResult {
  connected: boolean;
}

export function useNotificationStream(
  options: UseNotificationStreamOptions = {},
): UseNotificationStreamResult {
  const { enabled = true, onEvent } = options;
  const [connected, setConnected] = useState(false);

  // Keep the latest onEvent in a ref so we don't reopen the stream every
  // time the caller's callback identity changes.
  const cbRef = useRef(onEvent);
  useEffect(() => {
    cbRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }
    if (typeof window === "undefined") return;
    if (!("EventSource" in window)) return;

    let es: EventSource | null = null;
    let closed = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const open = () => {
      es = new EventSource("/api/notifications/stream", { withCredentials: true });

      es.addEventListener("ready", () => {
        if (closed) return;
        setConnected(true);
      });

      es.addEventListener("notification", (e: MessageEvent) => {
        if (closed) return;
        try {
          const data = JSON.parse(e.data);
          cbRef.current?.({
            kind: "notification",
            data,
          });
        } catch {
          /* ignore malformed payload */
        }
      });

      es.addEventListener("unread", (e: MessageEvent) => {
        if (closed) return;
        try {
          const data = JSON.parse(e.data);
          cbRef.current?.({ kind: "unread", data });
        } catch {
          /* ignore */
        }
      });

      es.onerror = () => {
        if (closed) return;
        setConnected(false);
        // EventSource auto-reconnects, but if the connection has gone fully
        // cold (e.g., proxy killed it), force a fresh connection after a
        // short delay. We cap at one retry-in-flight; the next visibility
        // change or successful ready event resets the loop.
        try {
          es?.close();
        } catch {
          /* noop */
        }
        reconnectTimer = setTimeout(() => {
          if (!closed) open();
        }, 5000);
      };
    };

    open();

    // Reconnect immediately when the tab becomes visible again — the OS may
    // have suspended the socket while backgrounded.
    const onVisibility = () => {
      if (document.visibilityState === "visible" && !closed) {
        try {
          // If the connection is still alive this is a noop; if it died
          // while hidden, this kicks a fresh one.
          if (es?.readyState === EventSource.CLOSED) open();
        } catch {
          /* noop */
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      closed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      try {
        es?.close();
      } catch {
        /* noop */
      }
      setConnected(false);
    };
  }, [enabled]);

  return { connected };
}
