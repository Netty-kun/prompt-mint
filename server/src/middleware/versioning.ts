import type { Request, Response, NextFunction } from "express";

/**
 * API versioning middleware (#209).
 *
 * Supports three version resolution strategies (checked in order):
 *   1. Explicit URL path segment: /api/v2/prompts  →  version "2"
 *   2. Accept-Version header:    Accept-Version: 2
 *   3. Query parameter:          ?api_version=2
 *
 * Defaults to version "1" when none is provided.
 *
 * Deprecation headers are added for versions older than the current
 * version so consumers can migrate before removal.
 */

const CURRENT_VERSION = 1;
const SUPPORTED_VERSIONS = [1, 2];
const DEPRECATED_VERSIONS: number[] = [];
const REMOVAL_DATE: Record<number, string> = {};

function resolveVersion(req: Request): { version: number; source: string } {
  // 1. URL path segment: /api/v{n}/...
  const pathMatch = req.path.match(/^\/v(\d+)\//);
  if (pathMatch) {
    return { version: parseInt(pathMatch[1], 10), source: "path" };
  }

  // 2. Accept-Version header
  const headerVersion = req.headers["accept-version"];
  if (typeof headerVersion === "string" && headerVersion.trim()) {
    return { version: parseInt(headerVersion.trim(), 10), source: "header" };
  }

  // 3. Query parameter
  const queryVersion = req.query.api_version;
  if (typeof queryVersion === "string" && queryVersion.trim()) {
    return { version: parseInt(queryVersion.trim(), 10), source: "query" };
  }

  return { version: CURRENT_VERSION, source: "default" };
}

export function versionNegotiation(_req: Request, res: Response, next: NextFunction): void {
  const { version } = resolveVersion(_req);

  if (!SUPPORTED_VERSIONS.includes(version)) {
    res.status(400).json({
      error: `API version ${version} is not supported. Supported versions: ${SUPPORTED_VERSIONS.join(", ")}.`,
      supportedVersions: SUPPORTED_VERSIONS,
      currentVersion: CURRENT_VERSION,
    });
    return;
  }

  // Attach resolved version to request for downstream handlers.
  (_req as Request & { apiVersion: number }).apiVersion = version;

  // Always include version metadata in response headers.
  res.setHeader("X-API-Version", version);
  res.setHeader("X-API-Current-Version", CURRENT_VERSION);

  if (DEPRECATED_VERSIONS.includes(version)) {
    res.setHeader("Deprecation", "true");
    if (REMOVAL_DATE[version]) {
      res.setHeader("Sunset", REMOVAL_DATE[version]);
    }
  }

  next();
}

/** Express-style router that mounts handlers under /api/v{n}/. */
export function mountVersionedRoutes(
  app: import("express").Express,
  version: number,
  basePath: string,
  router: import("express").Router,
): void {
  app.use(`/api/v${version}${basePath}`, router);
}
