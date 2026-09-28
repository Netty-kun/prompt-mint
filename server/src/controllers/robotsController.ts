import { Request, Response } from "express";

export interface SEOControlsPayload {
  index?: boolean;
  follow?: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  canonicalUrl?: string;
}

// In-memory or fallback SEO control store indexed by prompt ID
const seoStore = new Map<string, SEOControlsPayload>();

/**
 * Serves /robots.txt endpoint with disallow rules for sensitive unlock paths
 */
export const getRobotsTxt = (req: Request, res: Response): void => {
  const host = req.get("host") || "localhost:5000";
  const protocol = req.protocol || "https";
  const baseUrl = process.env.PUBLIC_URL || `${protocol}://${host}`;

  const content = [
    "User-agent: *",
    "Allow: /",
    "Allow: /prompts/",
    "Disallow: /api/prompts/*/unlock",
    "Disallow: /api/auth/",
    "Disallow: /admin/",
    "",
    `Sitemap: ${baseUrl}/sitemap.xml`,
  ].join("\n");

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(content);
};

/**
 * Returns SEO controls for a prompt listing
 */
export const getSEOControls = (req: Request, res: Response): void => {
  const promptId = req.query.promptId as string;
  if (!promptId) {
    res.status(400).json({ error: "Missing required promptId parameter." });
    return;
  }

  const existing = seoStore.get(promptId) || {
    index: true,
    follow: true,
    noarchive: false,
    nosnippet: false,
    canonicalUrl: "",
  };

  res.setHeader("X-Robots-Tag", formatXRobotsHeader(existing));
  res.status(200).json({ promptId, controls: existing });
};

/**
 * Updates SEO controls for a prompt listing
 */
export const updateSEOControls = (req: Request, res: Response): void => {
  const { promptId, index = true, follow = true, noarchive = false, nosnippet = false, canonicalUrl = "", creatorAddress } = req.body;

  if (!promptId) {
    res.status(400).json({ error: "Missing required promptId field." });
    return;
  }

  const authHeader = req.headers.authorization;
  const userAddress = req.headers["x-user-address"] as string;

  // Simple permission check: must provide user address matching creatorAddress or admin header
  const isAdmin = authHeader === "Bearer admin-secret-token" || authHeader === "admin";
  const isCreator = userAddress && creatorAddress && userAddress.toLowerCase() === creatorAddress.toLowerCase();

  if (!isAdmin && !isCreator) {
    res.status(403).json({
      error: "Unauthorized: Only the listing creator or marketplace admin can modify SEO controls.",
    });
    return;
  }

  // Validate canonical URL scheme if provided
  if (canonicalUrl && typeof canonicalUrl === "string" && canonicalUrl.trim() !== "") {
    const trimmed = canonicalUrl.trim();
    if (trimmed.startsWith("javascript:") || trimmed.startsWith("data:")) {
      res.status(400).json({ error: "Invalid canonical URL scheme." });
      return;
    }
  }

  const updated: SEOControlsPayload = {
    index: Boolean(index),
    follow: Boolean(follow),
    noarchive: Boolean(noarchive),
    nosnippet: Boolean(nosnippet),
    canonicalUrl: typeof canonicalUrl === "string" ? canonicalUrl.trim() : "",
  };

  seoStore.set(String(promptId), updated);

  res.setHeader("X-Robots-Tag", formatXRobotsHeader(updated));
  res.status(200).json({
    success: true,
    promptId,
    controls: updated,
  });
};

/**
 * Formats X-Robots-Tag header value
 */
export function formatXRobotsHeader(controls: SEOControlsPayload): string {
  const parts: string[] = [];
  parts.push(controls.index !== false ? "index" : "noindex");
  parts.push(controls.follow !== false ? "follow" : "nofollow");

  if (controls.noarchive) parts.push("noarchive");
  if (controls.nosnippet) parts.push("nosnippet");

  return parts.join(", ");
}
