export interface SEOConfig {
  index: boolean;
  follow: boolean;
  noarchive?: boolean;
  nosnippet?: boolean;
  canonicalUrl?: string;
}

export interface SEOValidationResult {
  isValid: boolean;
  formattedUrl?: string;
  error?: string;
}

export const DEFAULT_SEO_CONFIG: SEOConfig = {
  index: true,
  follow: true,
  noarchive: false,
  nosnippet: false,
  canonicalUrl: "",
};

/**
 * Build robots string for meta tag or X-Robots-Tag header.
 * e.g. "index, follow" or "noindex, nofollow, noarchive"
 */
export function formatRobotsMeta(config?: Partial<SEOConfig> | null): string {
  const merged: SEOConfig = { ...DEFAULT_SEO_CONFIG, ...config };
  const parts: string[] = [];

  parts.push(merged.index ? "index" : "noindex");
  parts.push(merged.follow ? "follow" : "nofollow");

  if (merged.noarchive) {
    parts.push("noarchive");
  }
  if (merged.nosnippet) {
    parts.push("nosnippet");
  }

  return parts.join(", ");
}

/**
 * Validates a canonical URL input.
 * Supports absolute HTTP/HTTPS URLs and absolute paths starting with '/'.
 * Rejects unsafe schemes like javascript:, data:, etc.
 */
export function validateCanonicalUrl(
  url?: string | null,
  baseOrigin?: string
): SEOValidationResult {
  if (!url || url.trim() === "") {
    return { isValid: true, formattedUrl: "" };
  }

  const trimmed = url.trim();

  // Check for dangerous protocol prefixes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:") ||
    lower.startsWith("file:")
  ) {
    return {
      isValid: false,
      error: "Canonical URL contains an invalid or untrusted protocol scheme.",
    };
  }

  // Handle relative paths
  if (trimmed.startsWith("/")) {
    if (baseOrigin) {
      try {
        const fullUrl = new URL(trimmed, baseOrigin).toString();
        return { isValid: true, formattedUrl: fullUrl };
      } catch {
        return { isValid: false, error: "Invalid relative canonical URL." };
      }
    }
    return { isValid: true, formattedUrl: trimmed };
  }

  // Handle absolute URLs
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        isValid: false,
        error: "Canonical URL must use http:// or https:// protocol.",
      };
    }
    return { isValid: true, formattedUrl: parsed.toString() };
  } catch {
    return {
      isValid: false,
      error: "Malformed URL structure. Please enter a valid URL.",
    };
  }
}

/**
 * Resolves the effective canonical URL for a prompt listing.
 */
export function resolveCanonicalUrl(
  promptId: string | number,
  customCanonicalUrl?: string | null,
  origin?: string
): string {
  const validation = validateCanonicalUrl(customCanonicalUrl, origin);
  if (validation.isValid && validation.formattedUrl && validation.formattedUrl !== "") {
    return validation.formattedUrl;
  }

  const path = `/prompts/${promptId}`;
  if (origin) {
    try {
      return new URL(path, origin).toString();
    } catch {
      return path;
    }
  }
  return path;
}

/**
 * Checks if the current user has permission to modify SEO controls for a listing.
 */
export function canEditSEOControls(
  userAddress?: string | null,
  creatorAddress?: string | null,
  isModerator: boolean = false
): { allowed: boolean; reason?: string } {
  if (isModerator) {
    return { allowed: true };
  }

  if (!userAddress) {
    return {
      allowed: false,
      reason: "Wallet must be connected to edit SEO controls.",
    };
  }

  if (!creatorAddress) {
    return {
      allowed: false,
      reason: "Listing creator address unavailable.",
    };
  }

  if (userAddress.toLowerCase() === creatorAddress.toLowerCase()) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: "Only the listing creator or marketplace moderators can edit SEO controls.",
  };
}
