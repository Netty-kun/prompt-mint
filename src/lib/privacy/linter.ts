/**
 * Pre-publish privacy linter for prompt previews.
 *
 * Checks listing metadata (title, preview, description, tags, image URL) for
 * accidentally exposed secrets, credentials, personal data, or other sensitive
 * content before it is committed on-chain.
 *
 * Each finding references the affected field, describes the risk, and carries a
 * severity. High-severity findings should block publishing until resolved.
 */

export type LinterSeverity = "high" | "medium" | "low";

export interface LinterFinding {
  field: string;
  severity: LinterSeverity;
  message: string;
  risk: string;
  pattern: string;
}

export interface LinterInput {
  title: string;
  preview: string;
  description: string;
  tags: string[];
  imageUrl: string;
}

type LintRule = {
  field: keyof LinterInput;
  severity: LinterSeverity;
  patterns: RegExp[];
  message: string;
  risk: string;
  /** When true, any match is treated as high-confidence and blocks publishing. */
  blockPublish?: boolean;
};

const RULES: LintRule[] = [
  // API keys and tokens
  {
    field: "title",
    severity: "high",
    patterns: [
      /sk-proj-[a-zA-Z0-9_-]{20,}/i,
      /sk-[a-zA-Z0-9]{20,}/i,
      /pk-[a-zA-Z0-9]{20,}/i,
      /api[-_]?key[-_]?['"`: ]*[a-zA-Z0-9_-]{16,}/i,
    ],
    message: "API key pattern detected",
    risk: "Exposing an API key in the listing title gives anyone access to your billing account. Revoke the key immediately if real.",
    blockPublish: true,
  },
  {
    field: "preview",
    severity: "high",
    patterns: [
      /sk-proj-[a-zA-Z0-9_-]{20,}/i,
      /sk-[a-zA-Z0-9]{20,}/i,
      /pk-[a-zA-Z0-9]{20,}/i,
      /api[-_]?key[-_]?['"`: ]*[a-zA-Z0-9_-]{16,}/i,
    ],
    message: "API key pattern detected in preview",
    risk: "Preview text is publicly visible on browse cards. An exposed key is immediately compromised.",
    blockPublish: true,
  },
  // Credential patterns (password, secret, token)
  {
    field: "preview",
    severity: "high",
    patterns: [
      /password\s*[:=]\s*['"`]?\S{6,}/i,
      /secret\s*[:=]\s*['"`]?\S{6,}/i,
      /token\s*[:=]\s*['"`]?\S{8,}/i,
    ],
    message: "Credential-like pattern detected in preview",
    risk: "Hardcoded credentials in preview text are visible to all visitors before purchase.",
    blockPublish: true,
  },
  // Email addresses
  {
    field: "preview",
    severity: "medium",
    patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/],
    message: "Email address found in preview",
    risk: "Personal email addresses in public preview text may attract spam or doxxing.",
  },
  {
    field: "title",
    severity: "medium",
    patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/],
    message: "Email address found in title",
    risk: "Personal email in the title is exposed on every browse card.",
  },
  {
    field: "description",
    severity: "medium",
    patterns: [/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/],
    message: "Email address found in description",
    risk: "An email in the description is visible on the listing detail page.",
  },
  // IP addresses (private and public)
  {
    field: "preview",
    severity: "medium",
    patterns: [/\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})\b/],
    message: "Private IP address found in preview",
    risk: "Internal network addresses should not appear in public listing text.",
  },
  {
    field: "description",
    severity: "low",
    patterns: [/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/],
    message: "IP address found in description",
    risk: "IP addresses in listing metadata may leak infrastructure details.",
  },
  // URLs with embedded credentials
  {
    field: "imageUrl",
    severity: "high",
    patterns: [/https?:\/\/[^@]+@/],
    message: "Image URL contains embedded credentials",
    risk: "Embedding usernames or passwords in the image URL (e.g. https://user:pass@...) exposes credentials in the listing metadata.",
    blockPublish: true,
  },
  // Wallet/blockchain addresses
  {
    field: "preview",
    severity: "medium",
    patterns: [/\bG[A-Z0-9]{55}\b/],
    message: "Stellar public address found in preview",
    risk: "Wallet addresses in public text can link on-chain activity to this listing.",
  },
  {
    field: "description",
    severity: "medium",
    patterns: [/\bG[A-Z0-9]{55}\b/],
    message: "Stellar public address found in description",
    risk: "Wallet addresses in the description associate this listing with a specific on-chain identity.",
  },
  // Phone numbers
  {
    field: "preview",
    severity: "low",
    patterns: [/\b\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}\b/],
    message: "Phone number pattern detected in preview",
    risk: "Phone numbers in public listing text may attract spam.",
  },
  // Social security / national ID patterns (US-focused)
  {
    field: "preview",
    severity: "high",
    patterns: [/\b\d{3}-\d{2}-\d{4}\b/],
    message: "SSN-like pattern detected in preview",
    risk: "Social security numbers or similar identifiers must never appear in public content.",
    blockPublish: true,
  },
  // Private key / seed phrase patterns
  {
    field: "preview",
    severity: "high",
    patterns: [
      /private\s*key\s*[:=]\s*['"`]?\S{20,}/i,
      /seed\s*(?:phrase)?\s*[:=]\s*['"`]?(?:\w+\s+){3,}/i,
      /BEGIN\s+(?:RSA|EC|DSA|OPENSSH)\s+PRIVATE\s+KEY/,
    ],
    message: "Private key material detected in preview",
    risk: "Private keys or seed phrases in preview text compromise associated wallets immediately.",
    blockPublish: true,
  },
];

/**
 * Runs the privacy linter against all listing metadata fields.
 * Returns an array of findings sorted by severity (high first), then by field.
 */
export function lintListing(input: LinterInput): LinterFinding[] {
  const findings: LinterFinding[] = [];

  for (const rule of RULES) {
    const value = input[rule.field];
    const text = Array.isArray(value) ? value.join(" ") : value;
    if (!text) continue;

    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        findings.push({
          field: rule.field,
          severity: rule.severity,
          message: rule.message,
          risk: rule.risk,
          pattern: pattern.source,
        });
        break;
      }
    }
  }

  findings.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  return findings;
}

/**
 * Returns true when there are high-severity findings that should block publishing.
 */
export function hasBlockingFindings(input: LinterInput): boolean {
  return getBlockingFindings(input).length > 0;
}

/**
 * Returns only the findings that should block publishing (high severity with
 * blockPublish flagged rules).
 */
export function getBlockingFindings(input: LinterInput): LinterFinding[] {
  const allFindings = lintListing(input);
  const blockSources = new Set(
    RULES.filter((r) => r.blockPublish).flatMap((r) => r.patterns.map((p) => p.source)),
  );
  return allFindings.filter((f) => blockSources.has(f.pattern));
}
