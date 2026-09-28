import type { NextFunction, Request, Response } from "express";
import crypto from "node:crypto";
import { cacheGet, cacheSet, cacheSetNX, cacheDel } from "../services/cacheService";

const IDEMPOTENCY_HEADER = "idempotency-key";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Generous ceiling for how long a single request is allowed to take before
// its lock expires and a retry is allowed to run the handler again.
const LOCK_TTL_SECONDS = 30;
// How long a completed response is replayed for retries of the same key.
const RESULT_TTL_SECONDS = 60 * 60 * 24;

interface StoredResult {
  status: number;
  body: unknown;
  requestHash: string;
}

function hashRequest(req: Request): string {
  return crypto
    .createHash("sha256")
    .update(`${req.method}:${req.originalUrl}:${JSON.stringify(req.body ?? {})}`)
    .digest("hex");
}

function buildKey(req: Request, idemKey: string): string {
  return `idempotency:${req.method}:${req.originalUrl}:${idemKey}`;
}

/**
 * Makes retried state-changing requests (POST/PUT/PATCH/DELETE) safe to
 * repeat when a client attaches an `Idempotency-Key` header — e.g. after a
 * timeout where the client can't tell if the first attempt landed. The
 * first request executes normally and its response is cached; a retry with
 * the same key and payload replays that cached response instead of running
 * the handler again. Requests without the header are completely unaffected,
 * so existing clients keep working exactly as before.
 */
export function idempotency() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!STATE_CHANGING_METHODS.has(req.method)) {
      next();
      return;
    }

    const idemKey = req.header(IDEMPOTENCY_HEADER);
    if (!idemKey) {
      next();
      return;
    }

    const key = buildKey(req, idemKey);
    const requestHash = hashRequest(req);

    const existingRaw = await cacheGet(key);
    if (existingRaw) {
      let existing: StoredResult | null = null;
      try {
        existing = JSON.parse(existingRaw) as StoredResult;
      } catch {
        existing = null;
      }

      if (existing) {
        if (existing.requestHash !== requestHash) {
          res.status(409).json({
            error: "This Idempotency-Key was already used with a different request.",
          });
          return;
        }

        if (existing.status === 0) {
          res.status(409).json({
            error: "A request with this Idempotency-Key is still being processed.",
          });
          return;
        }

        res.status(existing.status).json(existing.body);
        return;
      }
    }

    const acquiredLock = await cacheSetNX(
      key,
      JSON.stringify({ status: 0, body: null, requestHash } satisfies StoredResult),
      LOCK_TTL_SECONDS,
    );
    if (!acquiredLock) {
      res.status(409).json({
        error: "A request with this Idempotency-Key is still being processed.",
      });
      return;
    }

    const originalJson = res.json.bind(res);
    res.json = ((body: unknown) => {
      if (res.statusCode >= 500) {
        // Server errors are treated as transient: don't lock the client
        // into replaying a 500, let the next attempt run the handler again.
        void cacheDel(key);
      } else {
        void cacheSet(
          key,
          JSON.stringify({ status: res.statusCode, body, requestHash } satisfies StoredResult),
          RESULT_TTL_SECONDS,
        );
      }
      return originalJson(body);
    }) as typeof res.json;

    next();
  };
}
