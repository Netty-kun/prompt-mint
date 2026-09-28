import { describe, it, expect, beforeEach } from "vitest";
import type { PromptRecord } from "@/lib/stellar/promptHashClient";
import {
  SEARCH_HISTORY_KEY,
  SEARCH_HISTORY_LIMIT,
  addSearchTerm,
  clearSearchHistory,
  filterPromptsBySearch,
  loadSearchHistory,
  normalizeHistory,
  promptMatchesSearch,
  recordSearchTerm,
} from "./searchHistory";

const makePrompt = (overrides: Partial<PromptRecord>): PromptRecord => ({
  id: 1n,
  creator: "GABC123",
  priceStroops: 10_000n,
  title: "Technical Architect",
  category: "Software Development",
  previewText: "Generate a production-ready plan.",
  description: "A senior engineering assistant.",
  tags: ["AI", "Architecture"],
  imageUrl: "https://example.com/x.png",
  salesCount: 0,
  active: true,
  contentHash: "hash",
  ...overrides,
});

describe("promptMatchesSearch", () => {
  const prompt = makePrompt({});

  it("matches everything on an empty/whitespace query", () => {
    expect(promptMatchesSearch(prompt, "")).toBe(true);
    expect(promptMatchesSearch(prompt, "   ")).toBe(true);
  });

  it("matches by title, description, category, creator, and tags (case-insensitive)", () => {
    expect(promptMatchesSearch(prompt, "architect")).toBe(true);
    expect(promptMatchesSearch(prompt, "SENIOR")).toBe(true);
    expect(promptMatchesSearch(prompt, "software")).toBe(true);
    expect(promptMatchesSearch(prompt, "gabc")).toBe(true);
    expect(promptMatchesSearch(prompt, "ai")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(promptMatchesSearch(prompt, "zzz-nope")).toBe(false);
  });

  it("tolerates missing optional fields", () => {
    const bare = makePrompt({ description: undefined, tags: undefined });
    expect(promptMatchesSearch(bare, "architect")).toBe(true);
    expect(promptMatchesSearch(bare, "architecture")).toBe(false);
  });
});

describe("filterPromptsBySearch", () => {
  it("returns matching prompts only", () => {
    const a = makePrompt({ id: 1n, title: "Alpha" });
    const b = makePrompt({ id: 2n, title: "Beta", description: "", tags: [] });
    const result = filterPromptsBySearch([a, b], "alpha");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1n);
  });

  it("returns all on empty query", () => {
    const a = makePrompt({ id: 1n });
    const b = makePrompt({ id: 2n });
    expect(filterPromptsBySearch([a, b], "  ")).toHaveLength(2);
  });
});

describe("normalizeHistory / addSearchTerm", () => {
  it("de-duplicates case-insensitively, most-recent-first", () => {
    expect(normalizeHistory(["A", "b", "a", "B"])).toEqual(["A", "b"]);
  });

  it("drops non-strings and blanks", () => {
    expect(normalizeHistory(["a", "", "  ", 5, null, "b"])).toEqual(["a", "b"]);
  });

  it("returns [] for non-array input", () => {
    expect(normalizeHistory("nope")).toEqual([]);
  });

  it("promotes a repeated term to the front", () => {
    expect(addSearchTerm(["a", "b", "c"], "c")).toEqual(["c", "a", "b"]);
  });

  it("ignores an empty term", () => {
    expect(addSearchTerm(["a", "b"], "   ")).toEqual(["a", "b"]);
  });

  it("caps the history length", () => {
    const many = Array.from({ length: 20 }, (_, i) => `term-${i}`);
    expect(normalizeHistory(many)).toHaveLength(SEARCH_HISTORY_LIMIT);
  });
});

describe("persistence", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("records and loads terms from a versioned key", () => {
    recordSearchTerm("hello");
    recordSearchTerm("world");
    expect(loadSearchHistory()).toEqual(["world", "hello"]);
    expect(window.localStorage.getItem(SEARCH_HISTORY_KEY)).toContain("world");
  });

  it("clears persisted history", () => {
    recordSearchTerm("hello");
    clearSearchHistory();
    expect(loadSearchHistory()).toEqual([]);
  });

  it("returns [] when nothing stored / corrupt", () => {
    expect(loadSearchHistory()).toEqual([]);
    window.localStorage.setItem(SEARCH_HISTORY_KEY, "{not json");
    expect(loadSearchHistory()).toEqual([]);
  });
});
