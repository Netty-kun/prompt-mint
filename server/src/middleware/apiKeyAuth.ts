import type { NextFunction, Request, Response } from "express";
import {
  ApiScope,
  InMemoryRateLimiter,
  RateLimitTier,
  hasScope,
  rateLimitForTier,
  verifyApiKey,
} from "../services/apiKeys";

/**
 * API key authentication + authorization middleware (#287).
 *
 * The DB lookup is injected so the authorization/rate-limit logic is testable
 * without a live Mongo connection (see tests). In production, `createApiKeyAuth`
 * is called with a resolver backed by the ApiKey model.
 */

export interface ResolvedApiKey {
  id: string;
  ownerWallet: string;
  hashedKey: string;
  scopes: ApiScope[];
  rateLimitTier: RateLimitTier;
  revoked: boolean;
}

export interface ApiKeyContext {
  id: string;
  ownerWallet: string;
  scopes: ApiScope[];
}

export interface ApiKeyAuthOptions {
  /** Resolves a key record by its public prefix, or null if unknown. */
  resolveByPrefix: (prefix: string) => Promise<ResolvedApiKey | null>;
  /** Records a successful use (increment counter, stamp lastUsedAt). */
  recordUsage?: (id: string) => Promise<void> | void;
  rateLimiter?: InMemoryRateLimiter;
}

const BEARER_PREFIX = "Bearer ";

/** Extracts a presented key from Authorization or X-Api-Key headers. */
export function extractPresentedKey(req: {
  headers: Record<string, unknown>;
}): string | null {
  const auth = req.headers["authorization"];
  if (typeof auth === "string" && auth.startsWith(BEARER_PREFIX)) {
    return auth.slice(BEARER_PREFIX.length).trim();
  }
  const apiKeyHeader = req.headers["x-api-key"];
  if (typeof apiKeyHeader === "string" && apiKeyHeader.trim()) {
    return apiKeyHeader.trim();
  }
  return null;
}

function prefixOf(plaintext: string): string | null {
  const parts = plaintext.split("_");
  if (parts.length < 3 || parts[0] !== "pm") return null;
  return parts[1] || null;
}

export interface AuthEvaluation {
  status: 200 | 401 | 403 | 429;
  error?: string;
  context?: ApiKeyContext;
}

/**
 * Pure evaluation of a presented key against scope + rate limits. Returned as a
 * value so it can be tested directly and reused by the Express wrapper below.
 */
export async function evaluateApiKey(
  presented: string | null,
  requiredScope: ApiScope,
  options: ApiKeyAuthOptions,
  rateLimiter: InMemoryRateLimiter,
): Promise<AuthEvaluation> {
  if (!presented) {
    return { status: 401, error: "Missing API key." };
  }

  const prefix = prefixOf(presented);
  if (!prefix) {
    return { status: 401, error: "Malformed API key." };
  }

  const record = await options.resolveByPrefix(prefix);
  if (!record || record.revoked) {
    return { status: 401, error: "Invalid or revoked API key." };
  }

  if (!verifyApiKey(presented, record.hashedKey)) {
    return { status: 401, error: "Invalid API key." };
  }

  if (!hasScope(record.scopes, requiredScope)) {
    return {
      status: 403,
      error: `API key lacks required scope: ${requiredScope}.`,
    };
  }

  const limit = rateLimitForTier(record.rateLimitTier);
  const rl = rateLimiter.check(record.id, limit);
  if (!rl.allowed) {
    return { status: 429, error: "Rate limit exceeded." };
  }

  return {
    status: 200,
    context: {
      id: record.id,
      ownerWallet: record.ownerWallet,
      scopes: record.scopes,
    },
  };
}

/**
 * Express middleware factory. Attaches `req.apiKey` on success.
 */
export function createApiKeyAuth(
  requiredScope: ApiScope,
  options: ApiKeyAuthOptions,
) {
  const rateLimiter = options.rateLimiter ?? new InMemoryRateLimiter();

  return async (req: Request, res: Response, next: NextFunction) => {
    const presented = extractPresentedKey(req);
    const result = await evaluateApiKey(
      presented,
      requiredScope,
      options,
      rateLimiter,
    );

    if (result.status !== 200 || !result.context) {
      return res.status(result.status).json({ error: result.error });
    }

    (req as Request & { apiKey?: ApiKeyContext }).apiKey = result.context;
    if (options.recordUsage) {
      void Promise.resolve(options.recordUsage(result.context.id)).catch(
        () => {},
      );
    }
    next();
  };
}
