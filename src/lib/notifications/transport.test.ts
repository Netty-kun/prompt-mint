import { describe, it, expect, vi } from "vitest";
import { createPollingTransport } from "./transport";

describe("createPollingTransport", () => {
  it("emits fetched notifications immediately on subscribe", async () => {
    const transport = createPollingTransport({
      fetchNotifications: async () => [
        { id: "a", message: "hi", type: "primary", createdAt: 1 },
      ],
      setIntervalFn: (() => 0 as unknown) as typeof setInterval,
      clearIntervalFn: (() => {}) as typeof clearInterval,
    });

    const received: string[] = [];
    transport.subscribe((item) => received.push(item.id));
    await Promise.resolve();
    await Promise.resolve();
    expect(received).toEqual(["a"]);
  });

  it("stops emitting after teardown and clears its timer", async () => {
    const clearIntervalFn = vi.fn();
    const transport = createPollingTransport({
      fetchNotifications: async () => [],
      setIntervalFn: (() => 123 as unknown) as typeof setInterval,
      clearIntervalFn: clearIntervalFn as unknown as typeof clearInterval,
    });
    const teardown = transport.subscribe(() => {});
    teardown();
    expect(clearIntervalFn).toHaveBeenCalledWith(123);
  });
});
