import { describe, it, expect, beforeEach } from "vitest";
import {
  listBookmarks,
  isBookmarked,
  addBookmark,
  removeBookmark,
  toggleBookmark,
  bookmarkCount,
  clearBookmarks,
  BOOKMARKS_STORAGE_PREFIX,
} from "@/lib/bookmarks/bookmarks";

const WALLET_A = "GABCDEF1234567890ABCDEF1234567890ABCDEF1234567890ABC";
const WALLET_B = "GZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ";

describe("bookmarks storage (#284) — anonymous (no wallet)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(listBookmarks()).toEqual([]);
    expect(bookmarkCount()).toBe(0);
  });

  it("adds a bookmark and reports it", () => {
    addBookmark("1");
    expect(isBookmarked("1")).toBe(true);
    expect(listBookmarks()).toEqual(["1"]);
    expect(bookmarkCount()).toBe(1);
  });

  it("add is idempotent (no duplicates)", () => {
    addBookmark("1");
    addBookmark("1");
    expect(listBookmarks()).toEqual(["1"]);
  });

  it("removes a bookmark", () => {
    addBookmark("1");
    addBookmark("2");
    removeBookmark("1");
    expect(isBookmarked("1")).toBe(false);
    expect(listBookmarks()).toEqual(["2"]);
  });

  it("remove is idempotent for missing ids", () => {
    addBookmark("1");
    removeBookmark("999");
    expect(listBookmarks()).toEqual(["1"]);
  });

  it("toggle adds then removes and returns state", () => {
    expect(toggleBookmark("5")).toBe(true);
    expect(isBookmarked("5")).toBe(true);
    expect(toggleBookmark("5")).toBe(false);
    expect(isBookmarked("5")).toBe(false);
  });

  it("persists across reads (round-trip through localStorage)", () => {
    addBookmark("a");
    addBookmark("b");
    const raw = localStorage.getItem(`${BOOKMARKS_STORAGE_PREFIX}`);
    expect(raw).toBeTruthy();
    expect(listBookmarks().sort()).toEqual(["a", "b"]);
  });

  it("clears all bookmarks", () => {
    addBookmark("a");
    addBookmark("b");
    clearBookmarks();
    expect(listBookmarks()).toEqual([]);
    expect(bookmarkCount()).toBe(0);
  });

  it("tolerates corrupted storage gracefully", () => {
    localStorage.setItem(`${BOOKMARKS_STORAGE_PREFIX}`, "{not json");
    expect(listBookmarks()).toEqual([]);
    addBookmark("1");
    expect(listBookmarks()).toEqual(["1"]);
  });
});

describe("bookmarks — wallet-scoped", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("scopes bookmarks per wallet address", () => {
    addBookmark("1", WALLET_A);
    addBookmark("2", WALLET_B);
    expect(bookmarkCount(WALLET_A)).toBe(1);
    expect(bookmarkCount(WALLET_B)).toBe(1);
    expect(listBookmarks(WALLET_A)).toEqual(["1"]);
    expect(listBookmarks(WALLET_B)).toEqual(["2"]);
  });

  it("wallets do not see each other's bookmarks", () => {
    addBookmark("secret-prompt", WALLET_A);
    expect(isBookmarked("secret-prompt", WALLET_B)).toBe(false);
    expect(isBookmarked("secret-prompt")).toBe(false);
  });

  it("adds wallet-scoped bookmark idempotently", () => {
    addBookmark("1", WALLET_A);
    addBookmark("1", WALLET_A);
    expect(listBookmarks(WALLET_A)).toEqual(["1"]);
  });

  it("removes wallet-scoped bookmark", () => {
    addBookmark("1", WALLET_A);
    addBookmark("2", WALLET_A);
    removeBookmark("1", WALLET_A);
    expect(listBookmarks(WALLET_A)).toEqual(["2"]);
  });

  it("anonymous storage is separate from wallet-scoped", () => {
    addBookmark("anon-1");
    addBookmark("wallet-1", WALLET_A);
    expect(listBookmarks()).toEqual(["anon-1"]);
    expect(listBookmarks(WALLET_A)).toEqual(["wallet-1"]);
  });

  it("clears only the specified wallet's bookmarks", () => {
    addBookmark("1", WALLET_A);
    addBookmark("2", WALLET_B);
    clearBookmarks(WALLET_A);
    expect(bookmarkCount(WALLET_A)).toBe(0);
    expect(bookmarkCount(WALLET_B)).toBe(1);
  });

  it("wallet switching — new wallet has empty state after switching", () => {
    addBookmark("old", WALLET_A);
    expect(listBookmarks(WALLET_A)).toEqual(["old"]);
    expect(listBookmarks(WALLET_B)).toEqual([]);
  });

  it("tolerates corrupted storage per wallet", () => {
    localStorage.setItem(
      `${BOOKMARKS_STORAGE_PREFIX}:${WALLET_A}`,
      "{not json",
    );
    expect(listBookmarks(WALLET_A)).toEqual([]);
    addBookmark("1", WALLET_A);
    expect(listBookmarks(WALLET_A)).toEqual(["1"]);
  });
});
