import { isValidStellarAddress } from "@/lib/stellar/addressValidation";

export type PromptIdParseResult =
  | { ok: true; promptId: string }
  | { ok: false; error: string };

export type CreatorAddressParseResult =
  | { ok: true; address: string }
  | { ok: false; error: string };

const PROMPT_ID_PATTERN = /^\d+$/;

/**
 * Canonical in-app path for a marketplace listing.
 * Used by Recently Viewed and shareable links.
 */
export function buildPromptSharePath(promptId: string | number | bigint): string {
  const parsed = parsePromptIdParam(String(promptId));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return `/prompt/${parsed.promptId}`;
}

/**
 * Absolute shareable URL for a marketplace listing.
 */
export function buildPromptShareUrl(
  promptId: string | number | bigint,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const path = buildPromptSharePath(promptId);
  if (!origin) {
    return path;
  }
  return `${origin.replace(/\/$/, "")}${path}`;
}

/**
 * Canonical public creator profile path.
 * `/creator/:address` is the preferred share form; `/profile?address=` remains supported.
 */
export function buildCreatorSharePath(address: string): string {
  const parsed = parseCreatorAddressParam(address);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return `/creator/${parsed.address}`;
}

/**
 * Absolute shareable URL for a creator's public catalog.
 */
export function buildCreatorShareUrl(
  address: string,
  origin: string = typeof window !== "undefined" ? window.location.origin : "",
): string {
  const path = buildCreatorSharePath(address);
  if (!origin) {
    return path;
  }
  return `${origin.replace(/\/$/, "")}${path}`;
}

/**
 * Legacy / alternate creator deep link used by existing docs and profile query params.
 */
export function buildCreatorProfileQueryPath(address: string): string {
  const parsed = parseCreatorAddressParam(address);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return `/profile?address=${encodeURIComponent(parsed.address)}`;
}

/**
 * Parse and validate a prompt id from a route or query param.
 */
export function parsePromptIdParam(
  value: string | null | undefined,
): PromptIdParseResult {
  if (value == null || value.trim() === "") {
    return { ok: false, error: "Prompt id is required." };
  }

  const trimmed = value.trim();
  if (!PROMPT_ID_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "Invalid prompt id. Expected a non-negative integer.",
    };
  }

  // Reject leading zeros except for "0" itself to keep URLs canonical.
  if (trimmed.length > 1 && trimmed.startsWith("0")) {
    return {
      ok: false,
      error: "Invalid prompt id. Remove leading zeros.",
    };
  }

  return { ok: true, promptId: trimmed };
}

/**
 * Parse and validate a Stellar public key used in creator URLs.
 */
export function parseCreatorAddressParam(
  value: string | null | undefined,
): CreatorAddressParseResult {
  if (value == null || value.trim() === "") {
    return { ok: false, error: "Creator address is required." };
  }

  const trimmed = value.trim();
  if (!isValidStellarAddress(trimmed)) {
    return {
      ok: false,
      error: "Invalid creator address. Expected a Stellar G… public key.",
    };
  }

  return { ok: true, address: trimmed };
}

/**
 * Optional browse deep-link helper: `/browse?prompt=<id>`.
 * Remains supported for backward compatibility alongside `/prompt/:id`.
 */
export function buildBrowsePromptQueryPath(promptId: string | number | bigint): string {
  const parsed = parsePromptIdParam(String(promptId));
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  return `/browse?prompt=${encodeURIComponent(parsed.promptId)}`;
}
