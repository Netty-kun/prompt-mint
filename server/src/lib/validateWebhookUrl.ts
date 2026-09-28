import dns from "dns/promises";
import net from "net";

/**
 * SSRF-safe validation for creator-supplied webhook URLs (issue #23).
 *
 * `new URL(url)` only checks syntax — it says nothing about where the
 * request will actually go. A creator (or an attacker controlling a
 * creator account) could point a webhook at an internal service or a
 * cloud metadata endpoint (e.g. `http://169.254.169.254/latest/meta-data/`)
 * and use our server as a proxy into that network. This resolves the
 * hostname and rejects anything that lands on a private, loopback,
 * link-local, or otherwise non-public address.
 *
 * Known limitation: this checks the URL at registration/test time, not at
 * every delivery. A DNS answer can change between check and delivery
 * (DNS rebinding). Mitigating that fully requires resolving and pinning
 * the IP at request time in the HTTP client itself, which is a larger
 * change to `deliverOnce`'s fetch call; flagged as follow-up rather than
 * attempted here.
 */
export interface WebhookUrlValidationResult {
  valid: boolean;
  reason?: string;
}

const BLOCKED_HOSTNAMES = new Set(["localhost", "metadata.google.internal"]);

function isPrivateOrReservedIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true; // malformed => reject

  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local (incl. cloud metadata: 169.254.169.254)
  if (a === 0) return true; // "this" network
  if (a >= 224) return true; // multicast/reserved
  return false;
}

function isPrivateOrReservedIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true; // loopback
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  if (normalized.startsWith("::ffff:")) {
    // IPv4-mapped IPv6 address — validate the embedded IPv4 address too.
    return isPrivateOrReservedIPv4(normalized.replace("::ffff:", ""));
  }
  return false;
}

/**
 * Validates a webhook URL's scheme and resolves its hostname, rejecting
 * anything that isn't a plain public http(s) endpoint.
 */
export async function validateWebhookUrl(url: string): Promise<WebhookUrlValidationResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, reason: "url is not a valid URL." };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { valid: false, reason: "url must use http or https." };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { valid: false, reason: "url must not point at a local/internal hostname." };
  }

  // A literal IP in the URL — validate it directly without a DNS lookup.
  if (net.isIP(hostname)) {
    const blocked =
      net.isIPv4(hostname) ? isPrivateOrReservedIPv4(hostname) : isPrivateOrReservedIPv6(hostname);
    if (blocked) {
      return { valid: false, reason: "url resolves to a private or reserved IP address." };
    }
    return { valid: true };
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    return { valid: false, reason: "url hostname could not be resolved." };
  }

  if (addresses.length === 0) {
    return { valid: false, reason: "url hostname did not resolve to any address." };
  }

  for (const address of addresses) {
    const blocked = net.isIPv4(address)
      ? isPrivateOrReservedIPv4(address)
      : isPrivateOrReservedIPv6(address);
    if (blocked) {
      return { valid: false, reason: "url resolves to a private or reserved IP address." };
    }
  }

  return { valid: true };
}
