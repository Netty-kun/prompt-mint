import { logger } from "./logger";
import { metrics } from "./metrics";

/**
 * Generic circuit breaker for calls to degraded external dependencies
 * (Stellar RPC/Horizon, third-party APIs, SMTP, etc).
 *
 * States:
 *  - closed:     calls pass through normally.
 *  - open:       calls are rejected immediately without touching the
 *                dependency, until `resetTimeoutMs` has elapsed.
 *  - half-open:  a single trial call is allowed through; success closes
 *                the breaker, failure re-opens it.
 */
export type CircuitState = "closed" | "open" | "half-open";

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly breakerName: string) {
    super(`Circuit breaker "${breakerName}" is open — the dependency is currently degraded.`);
    this.name = "CircuitBreakerOpenError";
  }
}

export interface CircuitBreakerOptions {
  /** Consecutive failures required to trip the breaker open. Default 5. */
  failureThreshold?: number;
  /** How long the breaker stays open before allowing a trial call, in ms. Default 30s. */
  resetTimeoutMs?: number;
}

export interface CircuitBreakerSnapshot {
  name: string;
  state: CircuitState;
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastStateChangeAt: number;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT_MS = 30_000;

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private consecutiveFailures = 0;
  private lastFailureAt: number | null = null;
  private lastStateChangeAt = Date.now();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(
    public readonly name: string,
    options: CircuitBreakerOptions = {},
  ) {
    this.failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.resetTimeoutMs = options.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;
  }

  getState(): CircuitState {
    if (this.state === "open" && Date.now() - this.lastStateChangeAt >= this.resetTimeoutMs) {
      this.transitionTo("half-open");
    }
    return this.state;
  }

  getSnapshot(): CircuitBreakerSnapshot {
    return {
      name: this.name,
      state: this.getState(),
      consecutiveFailures: this.consecutiveFailures,
      lastFailureAt: this.lastFailureAt,
      lastStateChangeAt: this.lastStateChangeAt,
    };
  }

  /** Runs `fn` through the breaker, throwing CircuitBreakerOpenError without calling `fn` if open. */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === "open") {
      metrics.emit("circuit_breaker_rejected_total", 1, { breaker: this.name });
      throw new CircuitBreakerOpenError(this.name);
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  private onSuccess(): void {
    if (this.state !== "closed") {
      logger.info({ breaker: this.name }, "Circuit breaker recovered — closing");
    }
    this.consecutiveFailures = 0;
    this.transitionTo("closed");
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    this.lastFailureAt = Date.now();

    if (this.state === "half-open") {
      // Trial call failed — reopen immediately.
      this.transitionTo("open");
      return;
    }

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo("open");
    }
  }

  private transitionTo(next: CircuitState): void {
    if (this.state === next) return;
    logger.warn(
      { breaker: this.name, from: this.state, to: next, consecutiveFailures: this.consecutiveFailures },
      `Circuit breaker "${this.name}" transitioned from ${this.state} to ${next}`,
    );
    metrics.emit("circuit_breaker_state_total", 1, { breaker: this.name, state: next });
    this.state = next;
    this.lastStateChangeAt = Date.now();
  }

  /** Test/ops hook to force the breaker back to a clean closed state. */
  reset(): void {
    this.consecutiveFailures = 0;
    this.lastFailureAt = null;
    this.transitionTo("closed");
  }
}

const registry = new Map<string, CircuitBreaker>();

/** Returns a shared, named circuit breaker instance so all call sites for a given dependency share state. */
export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = registry.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, options);
    registry.set(name, breaker);
  }
  return breaker;
}

/** Snapshot of every registered breaker — used to surface degraded dependencies on status/health endpoints. */
export function listCircuitBreakers(): CircuitBreakerSnapshot[] {
  return Array.from(registry.values()).map((b) => b.getSnapshot());
}

/** Test-only hook to clear the registry between test files. */
export function _resetCircuitBreakerRegistry(): void {
  registry.clear();
}
