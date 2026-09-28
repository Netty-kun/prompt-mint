import { timingSafeEqual } from "crypto";

const BEARER_PREFIX = "Bearer ";

/**
 * Validates a bearer token against a configured admin secret using a
 * constant-time comparison. Fails closed: an unconfigured `expectedToken`
 * (missing, empty, or unset env var) never authorizes a request, so a
 * deployment that forgot to set the admin secret doesn't silently grant
 * access to anyone who sends a truthy `Authorization` header.
 */
export function isValidAdminToken(
  authHeader: string | undefined | null,
  expectedToken: string | undefined | null,
): boolean {
  if (!expectedToken) return false;
  if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) return false;

  const provided = authHeader.slice(BEARER_PREFIX.length);
  const providedBuf = Buffer.from(provided, "utf8");
  const expectedBuf = Buffer.from(expectedToken, "utf8");

  // timingSafeEqual throws on a length mismatch rather than returning false,
  // so the lengths must be checked first.
  if (providedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(providedBuf, expectedBuf);
}
