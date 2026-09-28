import {
  CircuitBreaker,
  CircuitBreakerOpenError,
  getCircuitBreaker,
  listCircuitBreakers,
  _resetCircuitBreakerRegistry,
} from "../services/circuitBreaker";

describe("server CircuitBreaker", () => {
  it("passes calls through while closed", async () => {
    const breaker = new CircuitBreaker("svc-ok", { failureThreshold: 3 });
    await expect(breaker.execute(async () => "ok")).resolves.toBe("ok");
    expect(breaker.getState()).toBe("closed");
  });

  it("opens after the failure threshold and rejects without calling the dependency", async () => {
    const breaker = new CircuitBreaker("svc-fail", { failureThreshold: 2, resetTimeoutMs: 10_000 });
    const failing = jest.fn().mockRejectedValue(new Error("down"));

    await expect(breaker.execute(failing)).rejects.toThrow("down");
    await expect(breaker.execute(failing)).rejects.toThrow("down");
    expect(breaker.getState()).toBe("open");

    const shouldNotRun = jest.fn().mockResolvedValue("nope");
    await expect(breaker.execute(shouldNotRun)).rejects.toBeInstanceOf(CircuitBreakerOpenError);
    expect(shouldNotRun).not.toHaveBeenCalled();
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("half-opens after the reset timeout and closes on a successful trial", async () => {
    jest.useFakeTimers();
    try {
      const breaker = new CircuitBreaker("svc-recover", { failureThreshold: 1, resetTimeoutMs: 1_000 });
      await expect(breaker.execute(async () => { throw new Error("fail"); })).rejects.toThrow();
      expect(breaker.getState()).toBe("open");

      jest.advanceTimersByTime(1_001);
      expect(breaker.getState()).toBe("half-open");

      await expect(breaker.execute(async () => "recovered")).resolves.toBe("recovered");
      expect(breaker.getState()).toBe("closed");
    } finally {
      jest.useRealTimers();
    }
  });

  it("shares state for the same registered name", () => {
    _resetCircuitBreakerRegistry();
    const a = getCircuitBreaker("shared");
    const b = getCircuitBreaker("shared");
    expect(a).toBe(b);
    expect(listCircuitBreakers().map((s) => s.name)).toContain("shared");
  });
});
