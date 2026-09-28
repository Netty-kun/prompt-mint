import { describe, it, expect } from "vitest";
import {
  formatRobotsMeta,
  validateCanonicalUrl,
  resolveCanonicalUrl,
  canEditSEOControls,
  DEFAULT_SEO_CONFIG,
} from "../../lib/seo/robotsCanonical";

describe("robotsCanonical Utilities", () => {
  describe("formatRobotsMeta", () => {
    it("returns default index, follow string when no config is provided", () => {
      expect(formatRobotsMeta()).toBe("index, follow");
      expect(formatRobotsMeta(DEFAULT_SEO_CONFIG)).toBe("index, follow");
    });

    it("formats custom robots directives correctly", () => {
      expect(
        formatRobotsMeta({
          index: false,
          follow: false,
          noarchive: true,
          nosnippet: true,
        })
      ).toBe("noindex, nofollow, noarchive, nosnippet");
    });

    it("handles partial configurations gracefully", () => {
      expect(formatRobotsMeta({ index: true, follow: false })).toBe("index, nofollow");
    });
  });

  describe("validateCanonicalUrl", () => {
    it("approves empty or null canonical URL as valid default", () => {
      expect(validateCanonicalUrl("")).toEqual({ isValid: true, formattedUrl: "" });
      expect(validateCanonicalUrl(null)).toEqual({ isValid: true, formattedUrl: "" });
    });

    it("approves valid absolute HTTP and HTTPS URLs", () => {
      const httpRes = validateCanonicalUrl("http://example.com/prompt/1");
      expect(httpRes.isValid).toBe(true);
      expect(httpRes.formattedUrl).toBe("http://example.com/prompt/1");

      const httpsRes = validateCanonicalUrl("https://promptmint.io/prompts/42");
      expect(httpsRes.isValid).toBe(true);
      expect(httpsRes.formattedUrl).toBe("https://promptmint.io/prompts/42");
    });

    it("handles relative path URLs with baseOrigin", () => {
      const res = validateCanonicalUrl("/prompts/100", "https://promptmint.io");
      expect(res.isValid).toBe(true);
      expect(res.formattedUrl).toBe("https://promptmint.io/prompts/100");
    });

    it("rejects untrusted/malicious URL schemes", () => {
      const jsRes = validateCanonicalUrl("javascript:alert(1)");
      expect(jsRes.isValid).toBe(false);
      expect(jsRes.error).toContain("invalid or untrusted protocol");

      const dataRes = validateCanonicalUrl("data:text/html,hack");
      expect(dataRes.isValid).toBe(false);
    });

    it("rejects malformed URLs", () => {
      const badRes = validateCanonicalUrl("ht!tp://invalid url");
      expect(badRes.isValid).toBe(false);
    });
  });

  describe("resolveCanonicalUrl", () => {
    it("returns custom canonical URL if valid", () => {
      const custom = "https://customdomain.com/prompts/1";
      expect(resolveCanonicalUrl(1, custom, "https://promptmint.io")).toBe(custom);
    });

    it("falls back to prompt ID permalink if custom URL is empty", () => {
      expect(resolveCanonicalUrl(42, "", "https://promptmint.io")).toBe(
        "https://promptmint.io/prompts/42"
      );
    });

    it("returns relative path if no origin is available", () => {
      expect(resolveCanonicalUrl(42, "")).toBe("/prompts/42");
    });
  });

  describe("canEditSEOControls", () => {
    const creator = "GCREATOR1234567890ABCDEF";
    const buyer = "GBUYER9876543210FEDCBA";

    it("allows moderator access regardless of wallet", () => {
      expect(canEditSEOControls(buyer, creator, true)).toEqual({ allowed: true });
    });

    it("allows prompt creator access", () => {
      expect(canEditSEOControls(creator, creator, false)).toEqual({ allowed: true });
    });

    it("denies access for non-creators with clear reason", () => {
      const res = canEditSEOControls(buyer, creator, false);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Only the listing creator or marketplace moderators");
    });

    it("denies access if wallet is not connected", () => {
      const res = canEditSEOControls(null, creator, false);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain("Wallet must be connected");
    });
  });
});
