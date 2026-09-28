import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitBreaker,
  listCircuitBreakers,
  _resetCircuitBreakerRegistry,
} from "./circuitBreaker";

describe("CircuitBreaker", () => {
  it("stays closed and passes calls through while the dependency succeeds", async () => {
    const breaker = new CircuitBreaker("test-success", { failureThreshold: 3 });
    const fn = vi.fn().mockResolvedValue("ok");

    await expect(breaker.execute(fn)).resolves.toBe("ok");
    expect(breaker.getState()).toBe("closed");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("opens after reaching the consecutive failure threshold", async () => {
    const breaker = new CircuitBreaker("test-open", { failureThreshold: 3, resetTimeoutMs: 10_000 });
    const failing = vi.fn().mockRejectedValue(new Error("dependency down"));

    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failing)).rejects.toThrow("dependency down");
    }

    expect(breaker.getState()).toBe("open");
    expect(failing).toHaveBeenCalledTimes(3);
  });

  it("rejects immediately without invoking the dependency once open", async () => {
    const breaker = new CircuitBreaker("test-reject", { failureThreshold: 1, resetTimeoutMs: 10_000 });
    const failing = vi.fn().mockRejectedValue(new Error("boom"));

    await expect(breaker.execute(failing)).rejects.toThrow("boom");
    expect(breaker.getState()).toBe("open");

    const shouldNotRun = vi.fn().mockResolvedValue("should not run");
    await expect(breaker.execute(shouldNotRun)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(shouldNotRun).not.toHaveBeenCalled();
  });

  it("moves to half-open after the reset timeout and closes again on a successful trial", async () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker("test-half-open", { failureThreshold: 1, resetTimeoutMs: 1_000 });
      await expect(breaker.execute(async () => { throw new Error("fail"); })).rejects.toThrow("fail");
      expect(breaker.getState()).toBe("open");

      vi.advanceTimersByTime(1_001);
      expect(breaker.getState()).toBe("half-open");

      await expect(breaker.execute(async () => "recovered")).resolves.toBe("recovered");
      expect(breaker.getState()).toBe("closed");
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-opens immediately if the half-open trial call fails", async () => {
    vi.useFakeTimers();
    try {
      const breaker = new CircuitBreaker("test-half-open-fail", { failureThreshold: 1, resetTimeoutMs: 1_000 });
      await expect(breaker.execute(async () => { throw new Error("fail"); })).rejects.toThrow("fail");
      vi.advanceTimersByTime(1_001);
      expect(breaker.getState()).toBe("half-open");

      await expect(breaker.execute(async () => { throw new Error("still failing"); })).rejects.toThrow(
        "still failing",
      );
      expect(breaker.getState()).toBe("open");
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets the failure count after any success while closed", async () => {
    const breaker = new CircuitBreaker("test-reset-count", { failureThreshold: 2, resetTimeoutMs: 10_000 });
    await expect(breaker.execute(async () => { throw new Error("one"); })).rejects.toThrow();
    expect(breaker.getState()).toBe("closed");

    await expect(breaker.execute(async () => "ok")).resolves.toBe("ok");

    // Another single failure should not open the breaker since the streak was reset.
    await expect(breaker.execute(async () => { throw new Error("two"); })).rejects.toThrow();
    expect(breaker.getState()).toBe("closed");
  });
});

describe("circuit breaker registry", () => {
  beforeEach(() => {
    _resetCircuitBreakerRegistry();
  });

  it("returns the same breaker instance for the same name", () => {
    const a = getCircuitBreaker("shared-dep");
    const b = getCircuitBreaker("shared-dep");
    expect(a).toBe(b);
  });

  it("lists snapshots of every registered breaker", async () => {
    const a = getCircuitBreaker("dep-a", { failureThreshold: 1, resetTimeoutMs: 10_000 });
    getCircuitBreaker("dep-b");

    await expect(a.execute(async () => { throw new Error("down"); })).rejects.toThrow();

    const snapshots = listCircuitBreakers();
    const names = snapshots.map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["dep-a", "dep-b"]));
    expect(snapshots.find((s) => s.name === "dep-a")?.state).toBe("open");
    expect(snapshots.find((s) => s.name === "dep-b")?.state).toBe("closed");
  });
});
