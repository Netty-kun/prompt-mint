import type { NextFunction, Request, Response } from "express";

// Enforced against the decompressed byte count as the body streams in, so
// this also bounds Content-Encoding-compressed (gzip/deflate) request
// bodies — not just plain ones. 300kb comfortably covers the largest
// legitimate payload (a ~50k-character prompt listing) with headroom.
export const JSON_BODY_LIMIT = "300kb";

/** Converts body-parser's raw "entity.too.large" error into a clean JSON 413. */
export function jsonBodyTooLargeHandler(err: any, _req: Request, res: Response, next: NextFunction): void {
  if (err?.type === "entity.too.large" || err?.status === 413) {
    res.status(413).json({ error: `Request body exceeds the ${JSON_BODY_LIMIT} limit.` });
    return;
  }
  next(err);
}
