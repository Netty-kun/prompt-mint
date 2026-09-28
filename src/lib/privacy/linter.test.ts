import { describe, expect, it } from "vitest";
import {
  lintListing,
  hasBlockingFindings,
  getBlockingFindings,
  type LinterInput,
} from "./linter";

const safeInput: LinterInput = {
  title: "Board-ready launch plan",
  preview: "A helpful prompt for planning product launches",
  description: "Use this prompt to plan cross-functional launch timelines.",
  tags: ["Marketing", "Launch", "Product"],
  imageUrl: "https://example.com/prompt-cover.png",
};

describe("privacy linter", () => {
  it("passes clean content without findings", () => {
    const findings = lintListing(safeInput);
    expect(findings).toHaveLength(0);
  });

  it("detects API key in preview and blocks publishing", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "Use this with sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
    };
    const findings = lintListing(input);
    const apiFindings = findings.filter((f) => f.message.includes("API key"));
    expect(apiFindings.length).toBeGreaterThan(0);
    expect(apiFindings[0].severity).toBe("high");
    expect(apiFindings[0].field).toBe("preview");
  });

  it("blocks on API key in title", () => {
    const input: LinterInput = {
      ...safeInput,
      title: "My API key is sk-proj-AbCdEfGhIjKlMnOpQrStUvWxYz1234567890",
    };
    expect(hasBlockingFindings(input)).toBe(true);
    const blockers = getBlockingFindings(input);
    expect(blockers.some((f) => f.field === "title")).toBe(true);
  });

  it("detects email address in preview", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "Contact me at alice@example.com for support",
    };
    const findings = lintListing(input);
    expect(findings.some((f) => f.message.includes("Email"))).toBe(true);
    expect(findings[0].severity).toBe("medium");
  });

  it("detects email address in title", () => {
    const input: LinterInput = {
      ...safeInput,
      title: "Contact alice@example.com for custom prompts",
    };
    const findings = lintListing(input);
    expect(findings.some((f) => f.message.includes("Email"))).toBe(true);
  });

  it("detects email in description", () => {
    const input: LinterInput = {
      ...safeInput,
      description: "Email me at bob@test.com for enterprise licenses",
    };
    const findings = lintListing(input);
    expect(findings.some((f) => f.field === "description" && f.message.includes("Email"))).toBe(true);
  });

  it("detects private IP in preview", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "Connect to internal server at 192.168.1.100",
    };
    const findings = lintListing(input);
    expect(findings.some((f) => f.message.includes("IP"))).toBe(true);
  });

  it("detects credential pattern (password=) in preview and blocks", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "Default password = hunter2 is used for testing",
    };
    expect(hasBlockingFindings(input)).toBe(true);
  });

  it("detects credential pattern (secret:) in preview and blocks", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "The secret: my-secret-token-value is required",
    };
    expect(hasBlockingFindings(input)).toBe(true);
  });

  it("detects SSN-like pattern in preview and blocks", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "User SSN is 123-45-6789",
    };
    expect(hasBlockingFindings(input)).toBe(true);
  });

  it("detects embedded credentials in image URL and blocks", () => {
    const input: LinterInput = {
      ...safeInput,
      imageUrl: "https://user:password@private-cdn.example.com/image.png",
    };
    expect(hasBlockingFindings(input)).toBe(true);
    const blockers = getBlockingFindings(input);
    expect(blockers.some((f) => f.field === "imageUrl")).toBe(true);
  });

  it("detects Stellar address in preview", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "Send XLM to GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1",
    };
    const findings = lintListing(input);
    expect(findings.some((f) => f.message.includes("Stellar"))).toBe(true);
  });

  it("detects Stellar address in description", () => {
    const input: LinterInput = {
      ...safeInput,
      description: "Payouts to GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1",
    };
    const findings = lintListing(input);
    expect(findings.some((f) => f.field === "description" && f.message.includes("Stellar"))).toBe(true);
  });

  it("detects private key material in preview and blocks", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "The private key=AbCdEfGhIjKlMnOpQrStUvWxYz1234567890AbCdEfGhIjKlMn",
    };
    expect(hasBlockingFindings(input)).toBe(true);
  });

  it("finds nothing for borderline but safe content", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "This prompt uses API strategies and has secret sauce inside",
      title: "Secret marketing formula revealed",
    };
    const findings = lintListing(input);
    expect(findings).toHaveLength(0);
  });

  it("sorts findings by severity (high first)", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "My email is user@test.com and password=supersecret123",
    };
    const findings = lintListing(input);
    for (let i = 1; i < findings.length; i++) {
      const order = { high: 0, medium: 1, low: 2 };
      expect(order[findings[i - 1].severity]).toBeLessThanOrEqual(order[findings[i].severity]);
    }
  });

  it("handles empty tags gracefully", () => {
    const input: LinterInput = { ...safeInput, tags: [] };
    const findings = lintListing(input);
    expect(Array.isArray(findings)).toBe(true);
  });

  it("reports multiple findings for the same field", () => {
    const input: LinterInput = {
      ...safeInput,
      preview: "Email user@test.com at IP 192.168.1.1 with password=admin123",
    };
    const findings = lintListing(input);
    const previewFindings = findings.filter((f) => f.field === "preview");
    expect(previewFindings.length).toBeGreaterThanOrEqual(2);
  });
});
