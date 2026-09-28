/**
 * versionGuard — Accept-Version negotiation helper for API route handlers.
 *
 * Usage in any route handler:
 *
 *   const version = negotiateVersion(req, res);
 *   if (!version) return; // response already sent (400 UNSUPPORTED_VERSION)
 *
 * The resolved ApiVersion is then passed into withVersion() / apiError() so
 * every response envelope carries the correct `apiVersion` stamp.
 */

import {
  ACCEPT_VERSION_HEADER,
  resolveApiVersion,
  SUPPORTED_API_VERSIONS,
  type ApiVersion,
} from "./payloadVersion";
import { apiError, ErrorCode } from "./errorCodes";
import { CURRENT_API_VERSION } from "./payloadVersion";

/**
 * Negotiate the API version for the current request.
 *
 * - If the `Accept-Version` header is absent or "latest" → returns CURRENT_API_VERSION.
 * - If it names a supported version → returns that version.
 * - If it names an unsupported version → writes a 400 JSON error and returns null.
 *   The caller MUST guard on null and return immediately.
 *
 * The resolved version is also echoed back in the `X-API-Version` response
 * header so clients can always confirm which version was served.
 */
export function negotiateVersion(
  req: { headers: Record<string, string | string[] | undefined> },
  res: { status(c: number): any; json(b: unknown): any; setHeader(k: string, v: string): void },
): ApiVersion | null {
  const version = resolveApiVersion(req.headers);

  if (version === null) {
    const raw = req.headers[ACCEPT_VERSION_HEADER];
    const requested = Array.isArray(raw) ? raw[0] : raw;
    res.setHeader("X-API-Version", CURRENT_API_VERSION);
    res
      .status(400)
      .json(
        apiError(
          ErrorCode.UNSUPPORTED_VERSION,
          `API version "${requested}" is not supported. Supported versions: ${SUPPORTED_API_VERSIONS.join(", ")}.`,
          undefined,
          CURRENT_API_VERSION,
        ),
      );
    return null;
  }

  res.setHeader("X-API-Version", version);
  return version;
}
