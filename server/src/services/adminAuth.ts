import { timingSafeEqual } from "crypto";

/**
 * Mirrored from src/lib/auth/adminToken.ts — kept as a self-contained copy
 * because `server/` is built and tested independently of the root project
 * (see tsconfig.json's `rootDir`).
 *
 * Validates a bearer token against a configured admin secret using a
 * constant-time comparison. Fails closed: an unconfigured `expectedToken`
 * never authorizes a request, so a deployment that forgot to set the admin
 * secret doesn't silently grant access to anyone who sends a truthy
 * `Authorization` header.
 */
const BEARER_PREFIX = "Bearer ";

export function isValidAdminToken(
  authHeader: string | undefined | null,
  expectedToken: string | undefined | null,
): boolean {
  if (!expectedToken) return false;
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) return false;

  const provided = authHeader.slice(BEARER_PREFIX.length);
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expectedToken, "utf8");

  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
