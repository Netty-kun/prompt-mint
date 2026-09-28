import { describe, it, expect } from "vitest";
import {
  parseHSL,
  hslToLuminance,
  contrastRatio,
  checkContrast,
  validateDarkThemeTokens,
} from "./contrast";

describe("parseHSL", () => {
  it("parses standard HSL string", () => {
    const result = parseHSL("210 40% 98%");
    expect(result).toEqual({ h: 210, s: 40, l: 98 });
  });

  it("parses HSL with decimal values", () => {
    const result = parseHSL("222.2 84% 4.9%");
    expect(result).toEqual({ h: 222.2, s: 84, l: 4.9 });
  });

  it("handles zero values", () => {
    const result = parseHSL("0 0% 0%");
    expect(result).toEqual({ h: 0, s: 0, l: 0 });
  });
});

describe("hslToLuminance", () => {
  it("returns correct luminance for pure white", () => {
    const lum = hslToLuminance(0, 0, 100);
    expect(lum).toBeCloseTo(1.0, 2);
  });

  it("returns correct luminance for pure black", () => {
    const lum = hslToLuminance(0, 0, 0);
    expect(lum).toBeCloseTo(0.0, 2);
  });

  it("returns higher luminance for lighter colors", () => {
    const lightLum = hslToLuminance(210, 50, 80);
    const darkLum = hslToLuminance(210, 50, 20);
    expect(lightLum).toBeGreaterThan(darkLum);
  });
});

describe("contrastRatio", () => {
  it("returns 21 for white on black", () => {
    const ratio = contrastRatio(1.0, 0.0);
    expect(ratio).toBeCloseTo(21, 0);
  });

  it("returns 1 for same luminance", () => {
    const ratio = contrastRatio(0.5, 0.5);
    expect(ratio).toBeCloseTo(1, 2);
  });
});

describe("checkContrast", () => {
  it("passes AA for white text on dark background", () => {
    const result = checkContrast("210 40% 98%", "222.2 84% 4.9%");
    expect(result.passesAA).toBe(true);
    expect(result.ratio).toBeGreaterThan(4.5);
  });

  it("returns detailed results", () => {
    const result = checkContrast("210 40% 98%", "222.2 84% 4.9%");
    expect(typeof result.ratio).toBe("number");
    expect(typeof result.passesAA).toBe("boolean");
    expect(typeof result.passesAALarge).toBe("boolean");
    expect(typeof result.passesAAA).toBe("boolean");
    expect(typeof result.passesAAANlarge).toBe("boolean");
  });

  it("fails AA for low contrast pairs", () => {
    const result = checkContrast("222.2 84% 4.9%", "217.2 32.6% 17.5%");
    expect(result.passesAA).toBe(false);
  });
});

describe("validateDarkThemeTokens", () => {
  it("returns empty array when all tokens pass", () => {
    const tokens = {
      "good-pair": { fg: "210 40% 98%", bg: "222.2 84% 4.9%" },
    };
    const failures = validateDarkThemeTokens(tokens);
    expect(failures).toHaveLength(0);
  });

  it("returns failures for low-contrast pairs", () => {
    const tokens = {
      "bad-pair": { fg: "222.2 84% 4.9%", bg: "217.2 32.6% 17.5%" },
    };
    const failures = validateDarkThemeTokens(tokens);
    expect(failures).toHaveLength(1);
    expect(failures[0].token).toBe("bad-pair");
    expect(failures[0].result.passesAA).toBe(false);
  });

  it("reports multiple failures", () => {
    const tokens = {
      "bad-1": { fg: "222.2 84% 4.9%", bg: "217.2 32.6% 17.5%" },
      "bad-2": { fg: "222.2 84% 4.9%", bg: "222.2 84% 4.9%" },
    };
    const failures = validateDarkThemeTokens(tokens);
    expect(failures.length).toBeGreaterThanOrEqual(1);
  });
});
