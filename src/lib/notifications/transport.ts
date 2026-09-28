/**
 * Notification delivery transport (#283).
 *
 * The issue asks for WebSocket real-time delivery. This repo has no server-side
 * WebSocket infrastructure to connect to (the Express app in `server/` exposes
 * only REST routes, and the Vercel `api/` handlers are stateless functions), so
 * the notification center is wired against this transport *interface*. A polling
 * fallback ships today; swapping in a real WebSocket later means providing a
 * `createWebSocketTransport(url)` implementation of the same interface — no
 * changes to the provider or UI.
 */

import type { NotificationRecord } from "./store";

export type IncomingNotification = Omit<
  NotificationRecord,
  "isRead" | "isVisible"
> & { isRead?: boolean };

export interface NotificationTransport {
  /**
   * Subscribe to inbound notifications. Returns an unsubscribe/teardown fn.
   */
  subscribe(onMessage: (item: IncomingNotification) => void): () => void;
}

export interface PollingTransportOptions {
  /** Fetches the current notification list for the connected user. */
  fetchNotifications: () => Promise<IncomingNotification[]>;
  /** Poll interval in ms. Defaults to 30s. */
  intervalMs?: number;
  /** Injectable timer setter (test seam). Defaults to setInterval. */
  setIntervalFn?: typeof setInterval;
  clearIntervalFn?: typeof clearInterval;
}

/**
 * Short-interval polling transport. Emits each fetched item; dedupe in the
 * store prevents already-seen notifications from re-appearing.
 */
export function createPollingTransport(
  options: PollingTransportOptions,
): NotificationTransport {
  const {
    fetchNotifications,
    intervalMs = 30_000,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval,
  } = options;

  return {
    subscribe(onMessage) {
      let cancelled = false;

      const poll = async () => {
        try {
          const items = await fetchNotifications();
          if (cancelled) return;
          for (const item of items) onMessage(item);
        } catch {
          // Network hiccups are non-fatal; the next tick retries.
        }
      };

      void poll();
      const handle = setIntervalFn(() => void poll(), intervalMs);

      return () => {
        cancelled = true;
        clearIntervalFn(handle);
      };
    },
  };
}

/**
 * WebSocket transport (future). Present so the swap-in path is explicit; not
 * used until a server WebSocket endpoint exists.
 */
export function createWebSocketTransport(url: string): NotificationTransport {
  return {
    subscribe(onMessage) {
      const socket = new WebSocket(url);
      socket.addEventListener("message", (event) => {
        try {
          onMessage(JSON.parse(event.data as string) as IncomingNotification);
        } catch {
          // Ignore malformed frames.
        }
      });
      return () => socket.close();
    },
  };
}
