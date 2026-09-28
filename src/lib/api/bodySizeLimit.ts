// eslint-disable-next-line no-unused-vars
export type ApiHandler = (_req: any, _res: any) => Promise<void> | void;

export const DEFAULT_MAX_BODY_BYTES = 100 * 1024; // 100kb

/**
 * Bounds request body size for Vercel serverless functions.
 *
 * The platform parses JSON/text bodies into `req.body` before our handler
 * runs, so a `Content-Length` pre-check alone isn't enough — that header can
 * understate the true size (e.g. a small gzip-encoded body that decompresses
 * into something much larger). Re-measuring the parsed `req.body` catches
 * that case too, since it reflects the post-decompression payload
 * regardless of what the client declared.
 */
export function withBodySizeLimit(handler: ApiHandler, maxBytes: number = DEFAULT_MAX_BODY_BYTES): ApiHandler {
  return async (req, res) => {
    const declaredLength = Number(req.headers?.["content-length"] ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      res.status(413).json({ error: `Request body exceeds the ${maxBytes}-byte limit.` });
      return;
    }

    if (req.body !== undefined && req.body !== null) {
      const serialized = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      const actualBytes = Buffer.byteLength(serialized, "utf8");
      if (actualBytes > maxBytes) {
        res.status(413).json({ error: `Request body exceeds the ${maxBytes}-byte limit.` });
        return;
      }
    }

    return handler(req, res);
  };
}
