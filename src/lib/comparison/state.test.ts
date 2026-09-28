import { describe, expect, it } from "vitest";
import {
  addToComparison,
  removeFromComparison,
  toggleComparison,
  isSelected,
  canAdd,
  canView,
  MAX_COMPARE,
  MIN_COMPARE,
  encodeComparisonShare,
  decodeComparisonShare,
  type ComparisonPrompt,
} from "./state";

const makePrompt = (id: string): ComparisonPrompt => ({
  id,
  title: `Prompt ${id}`,
  creator: "GABC...",
  price: 5,
  category: "Marketing",
});

describe("comparison selection state", () => {
  it("adds prompts", () => {
    const list = addToComparison([], makePrompt("1"));
    expect(list.map((p) => p.id)).toEqual(["1"]);
  });

  it("does not add duplicates", () => {
    let list = addToComparison([], makePrompt("1"));
    list = addToComparison(list, makePrompt("1"));
    expect(list).toHaveLength(1);
  });

  it("caps the selection at MAX_COMPARE (4)", () => {
    let list: ComparisonPrompt[] = [];
    for (let i = 1; i <= 6; i++) {
      list = addToComparison(list, makePrompt(String(i)));
    }
    expect(list).toHaveLength(MAX_COMPARE);
    expect(list.map((p) => p.id)).toEqual(["1", "2", "3", "4"]);
  });

  it("removes prompts by id without mutating input", () => {
    const original = [makePrompt("1"), makePrompt("2")];
    const list = removeFromComparison(original, "1");
    expect(list.map((p) => p.id)).toEqual(["2"]);
    expect(original).toHaveLength(2); // unchanged
  });

  it("toggles prompts in and out", () => {
    let list = toggleComparison([], makePrompt("1"));
    expect(isSelected(list, "1")).toBe(true);
    list = toggleComparison(list, makePrompt("1"));
    expect(isSelected(list, "1")).toBe(false);
  });

  it("canAdd is false once full", () => {
    const full = [makePrompt("1"), makePrompt("2"), makePrompt("3"), makePrompt("4")];
    expect(canAdd(full)).toBe(false);
    expect(canAdd(full.slice(0, 3))).toBe(true);
  });

  it("canView requires at least MIN_COMPARE (2)", () => {
    expect(canView([])).toBe(false);
    expect(canView([makePrompt("1")])).toBe(false);
    expect(canView([makePrompt("1"), makePrompt("2")])).toBe(true);
    expect(MIN_COMPARE).toBe(2);
  });
});

describe("comparison share URL encoding", () => {
  it("encodes ids into a shareable query string", () => {
    const encoded = encodeComparisonShare(["1", "2", "3"]);
    expect(encoded).toContain("?compare=");
    expect(encoded.length).toBeGreaterThan(10);
  });

  it("round-trips ids through encode and decode", () => {
    const ids = ["prompt-1", "prompt-2", "prompt-3"];
    const encoded = encodeComparisonShare(ids);
    const decoded = decodeComparisonShare(encoded);
    expect(decoded.sort()).toEqual(ids.sort());
  });

  it("returns empty string for empty ids", () => {
    expect(encodeComparisonShare([])).toBe("");
  });

  it("returns empty array for missing compare param", () => {
    expect(decodeComparisonShare("")).toEqual([]);
    expect(decodeComparisonShare("?other=value")).toEqual([]);
  });

  it("handles malformed base64 gracefully", () => {
    expect(decodeComparisonShare("?compare=not-base64!")).toEqual([]);
  });

  it("deduplicates ids in decoded output", () => {
    const encoded = encodeComparisonShare(["a", "b", "a"]);
    const decoded = decodeComparisonShare(encoded);
    expect(decoded).toEqual(["a", "b"]);
  });

  it("encodes without wallet or private info", () => {
    const encoded = encodeComparisonShare(["1"]);
    expect(encoded).not.toContain("wallet");
    expect(encoded).not.toContain("address");
    expect(encoded).not.toContain("rating");
    expect(encoded).not.toContain("price");
    expect(encoded).not.toContain("G");
  });

  it("handles single id", () => {
    const encoded = encodeComparisonShare(["only-one"]);
    const decoded = decodeComparisonShare(encoded);
    expect(decoded).toEqual(["only-one"]);
  });
});
