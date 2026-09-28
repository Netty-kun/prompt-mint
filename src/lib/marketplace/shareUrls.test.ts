import { describe, it, expect } from "vitest";
import {
  buildBrowsePromptQueryPath,
  buildCreatorProfileQueryPath,
  buildCreatorSharePath,
  buildCreatorShareUrl,
  buildPromptSharePath,
  buildPromptShareUrl,
  parseCreatorAddressParam,
  parsePromptIdParam,
} from "./shareUrls";

const VALID_CREATOR = "GAI4OWOTBCMC2IP5M3KS4KSF3ESIWNAFS3PSHQUBZRJA6KOCH2GY2I3K";

describe("shareable marketplace URLs", () => {
  describe("parsePromptIdParam", () => {
    it("accepts valid integer ids", () => {
      expect(parsePromptIdParam("42")).toEqual({ ok: true, promptId: "42" });
      expect(parsePromptIdParam("0")).toEqual({ ok: true, promptId: "0" });
    });

    it("rejects empty, non-numeric, and leading-zero ids", () => {
      expect(parsePromptIdParam(null).ok).toBe(false);
      expect(parsePromptIdParam("").ok).toBe(false);
      expect(parsePromptIdParam("abc").ok).toBe(false);
      expect(parsePromptIdParam("-1").ok).toBe(false);
      expect(parsePromptIdParam("01").ok).toBe(false);
      expect(parsePromptIdParam("1.5").ok).toBe(false);
    });
  });

  describe("parseCreatorAddressParam", () => {
    it("accepts valid Stellar public keys", () => {
      expect(parseCreatorAddressParam(VALID_CREATOR)).toEqual({
        ok: true,
        address: VALID_CREATOR,
      });
    });

    it("rejects missing or invalid addresses", () => {
      expect(parseCreatorAddressParam(null).ok).toBe(false);
      expect(parseCreatorAddressParam("").ok).toBe(false);
      expect(parseCreatorAddressParam("not-an-address").ok).toBe(false);
      expect(parseCreatorAddressParam("S" + VALID_CREATOR.slice(1)).ok).toBe(
        false,
      );
    });
  });

  describe("URL builders", () => {
    it("builds canonical prompt paths and absolute URLs", () => {
      expect(buildPromptSharePath(7)).toBe("/prompt/7");
      expect(buildPromptSharePath(BigInt(99))).toBe("/prompt/99");
      expect(buildPromptShareUrl(7, "https://app.example")).toBe(
        "https://app.example/prompt/7",
      );
      expect(buildPromptShareUrl(7, "https://app.example/")).toBe(
        "https://app.example/prompt/7",
      );
    });

    it("builds creator share paths and legacy profile query paths", () => {
      expect(buildCreatorSharePath(VALID_CREATOR)).toBe(
        `/creator/${VALID_CREATOR}`,
      );
      expect(buildCreatorShareUrl(VALID_CREATOR, "https://app.example")).toBe(
        `https://app.example/creator/${VALID_CREATOR}`,
      );
      expect(buildCreatorProfileQueryPath(VALID_CREATOR)).toBe(
        `/profile?address=${encodeURIComponent(VALID_CREATOR)}`,
      );
    });

    it("builds browse deep-link query paths for backward compatibility", () => {
      expect(buildBrowsePromptQueryPath(12)).toBe("/browse?prompt=12");
    });

    it("throws on invalid builder inputs", () => {
      expect(() => buildPromptSharePath("abc")).toThrow(/Invalid prompt id/);
      expect(() => buildCreatorSharePath("bad")).toThrow(/Invalid creator/);
    });
  });
});
