/**
 * Pure builders for third-party social share "intent" URLs (#285).
 *
 * These are deliberately framework-agnostic and side-effect free so the
 * URL-construction logic can be unit tested without a DOM. UI components pass
 * an already-resolved absolute listing URL (see {@link buildPromptShareUrl})
 * plus a human-readable share message.
 */

export interface SocialShareParams {
  /** Absolute URL to the shared resource (listing or creator page). */
  url: string;
  /** Human-readable message shown alongside the link. */
  text: string;
}

function requireNonEmpty(value: string, field: string): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    throw new Error(`${field} is required to build a share URL.`);
  }
  return trimmed;
}

/**
 * Twitter / X web intent.
 * https://twitter.com/intent/tweet?text=...&url=...
 */
export function buildTwitterShareUrl({ url, text }: SocialShareParams): string {
  const safeUrl = requireNonEmpty(url, "url");
  const safeText = requireNonEmpty(text, "text");
  const params = new URLSearchParams({ text: safeText, url: safeUrl });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/**
 * Telegram share intent.
 * https://t.me/share/url?url=...&text=...
 */
export function buildTelegramShareUrl({ url, text }: SocialShareParams): string {
  const safeUrl = requireNonEmpty(url, "url");
  const safeText = requireNonEmpty(text, "text");
  const params = new URLSearchParams({ url: safeUrl, text: safeText });
  return `https://t.me/share/url?${params.toString()}`;
}

export type SocialShareTarget = "twitter" | "telegram";

/**
 * Convenience dispatch used by the share UI.
 */
export function buildSocialShareUrl(
  target: SocialShareTarget,
  params: SocialShareParams,
): string {
  switch (target) {
    case "twitter":
      return buildTwitterShareUrl(params);
    case "telegram":
      return buildTelegramShareUrl(params);
    default: {
      const exhaustive: never = target;
      throw new Error(`Unsupported share target: ${String(exhaustive)}`);
    }
  }
}
