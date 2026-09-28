/**
 * Circuit breaker for calls to degraded external dependencies (SMTP, third
 * party HTTP APIs, etc), scoped to the standalone `server/` project.
 *
 * Mirrored from src/lib/observability/circuitBreaker.ts — kept as a
 * self-contained copy (console logging instead of the shared pino logger)
 * because `server/` is built and tested independently of the root project
 * and does not share its dependency graph (see tsconfig.json's `rootDir`).
 */
export type CircuitState = "closed" | "open" | "half-open";

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly breakerName: string) {
    super(`Circuit breaker "${breakerName}" is open — the dependency is currently degraded.`);
    this.name = "CircuitBreakerOpenError";
  }
}

export interface CircuitBreakerOptions {
  failureThreshold?: number;
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

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();
    if (currentState === "open") {
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
    this.consecutiveFailures = 0;
    this.transitionTo("closed");
  }

  private onFailure(): void {
    this.consecutiveFailures += 1;
    this.lastFailureAt = Date.now();

    if (this.state === "half-open") {
      this.transitionTo("open");
      return;
    }

    if (this.consecutiveFailures >= this.failureThreshold) {
      this.transitionTo("open");
    }
  }

  private transitionTo(next: CircuitState): void {
    if (this.state === next) return;
    console.warn(
      `[circuit-breaker] "${this.name}" transitioned from ${this.state} to ${next} (consecutiveFailures=${this.consecutiveFailures})`,
    );
    this.state = next;
    this.lastStateChangeAt = Date.now();
  }

  reset(): void {
    this.consecutiveFailures = 0;
    this.lastFailureAt = null;
    this.transitionTo("closed");
  }
}

const registry = new Map<string, CircuitBreaker>();

export function getCircuitBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
  let breaker = registry.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker(name, options);
    registry.set(name, breaker);
  }
  return breaker;
}

export function listCircuitBreakers(): CircuitBreakerSnapshot[] {
  return Array.from(registry.values()).map((b) => b.getSnapshot());
}

export function _resetCircuitBreakerRegistry(): void {
  registry.clear();
}
