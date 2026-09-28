import { describe, expect, it, beforeEach } from "vitest";
import {
  listCollections,
  listActiveCollections,
  getCollection,
  createCollection,
  renameCollection,
  archiveCollection,
  unarchiveCollection,
  deleteCollection,
  addPromptToCollection,
  removePromptFromCollection,
  reorderCollection,
  paginateCollection,
} from "./store";

const WALLET = "GCREATOR1234567890ABCDEFGH1234567890ABCDEFGH1234567890";

describe("collections store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(listCollections(WALLET)).toEqual([]);
    expect(listActiveCollections(WALLET)).toEqual([]);
  });

  it("creates a collection", () => {
    const col = createCollection("My Favorites", WALLET);
    expect(col.name).toBe("My Favorites");
    expect(col.promptIds).toEqual([]);
    expect(col.archived).toBe(false);
    expect(col.id).toBeTruthy();
    expect(listCollections(WALLET)).toHaveLength(1);
  });

  it("creates a collection with description", () => {
    const col = createCollection("Best Prompts", WALLET, "My top picks");
    expect(col.description).toBe("My top picks");
    expect(col.name).toBe("Best Prompts");
  });

  it("lists only active collections", () => {
    const col1 = createCollection("Active 1", WALLET);
    const col2 = createCollection("Active 2", WALLET);
    archiveCollection(col1.id, WALLET);
    const active = listActiveCollections(WALLET);
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe(col2.id);
  });

  it("renames a collection", () => {
    const col = createCollection("Old Name", WALLET);
    renameCollection(col.id, "New Name", WALLET);
    const updated = getCollection(col.id, WALLET);
    expect(updated?.name).toBe("New Name");
  });

  it("returns false when renaming non-existent collection", () => {
    expect(renameCollection("nonexistent", "Name", WALLET)).toBe(false);
  });

  it("archives and unarchives a collection", () => {
    const col = createCollection("Test", WALLET);
    expect(archiveCollection(col.id, WALLET)).toBe(true);
    expect(getCollection(col.id, WALLET)?.archived).toBe(true);
    expect(unarchiveCollection(col.id, WALLET)).toBe(true);
    expect(getCollection(col.id, WALLET)?.archived).toBe(false);
  });

  it("returns false when archiving non-existent collection", () => {
    expect(archiveCollection("nonexistent", WALLET)).toBe(false);
  });

  it("deletes a collection permanently", () => {
    const col = createCollection("Delete Me", WALLET);
    expect(deleteCollection(col.id, WALLET)).toBe(true);
    expect(listCollections(WALLET)).toHaveLength(0);
  });

  it("returns false when deleting non-existent collection", () => {
    expect(deleteCollection("nonexistent", WALLET)).toBe(false);
  });

  it("adds a prompt to a collection", () => {
    const col = createCollection("Test", WALLET);
    expect(addPromptToCollection(col.id, "prompt-1", WALLET)).toBe(true);
    expect(getCollection(col.id, WALLET)?.promptIds).toEqual(["prompt-1"]);
  });

  it("adds a prompt idempotently (no duplicates)", () => {
    const col = createCollection("Test", WALLET);
    addPromptToCollection(col.id, "prompt-1", WALLET);
    addPromptToCollection(col.id, "prompt-1", WALLET);
    expect(getCollection(col.id, WALLET)?.promptIds).toEqual(["prompt-1"]);
  });

  it("returns false when adding to non-existent collection", () => {
    expect(addPromptToCollection("nonexistent", "prompt-1", WALLET)).toBe(false);
  });

  it("removes a prompt from a collection", () => {
    const col = createCollection("Test", WALLET);
    addPromptToCollection(col.id, "prompt-1", WALLET);
    addPromptToCollection(col.id, "prompt-2", WALLET);
    expect(removePromptFromCollection(col.id, "prompt-1", WALLET)).toBe(true);
    expect(getCollection(col.id, WALLET)?.promptIds).toEqual(["prompt-2"]);
  });

  it("reorders a collection's prompts", () => {
    const col = createCollection("Test", WALLET);
    addPromptToCollection(col.id, "a", WALLET);
    addPromptToCollection(col.id, "b", WALLET);
    addPromptToCollection(col.id, "c", WALLET);
    reorderCollection(col.id, ["c", "a", "b"], WALLET);
    expect(getCollection(col.id, WALLET)?.promptIds).toEqual(["c", "a", "b"]);
  });

  it("paginates collection prompts", () => {
    const col = createCollection("Test", WALLET);
    for (let i = 1; i <= 25; i++) {
      addPromptToCollection(col.id, `prompt-${i}`, WALLET);
    }
    const page1 = paginateCollection(col.id, WALLET, 1, 10);
    expect(page1.prompts).toHaveLength(10);
    expect(page1.total).toBe(25);
    expect(page1.totalPages).toBe(3);
    expect(page1.prompts[0]).toBe("prompt-1");

    const page3 = paginateCollection(col.id, WALLET, 3, 10);
    expect(page3.prompts).toHaveLength(5);
  });

  it("paginate returns empty for non-existent collection", () => {
    const result = paginateCollection("nonexistent", WALLET);
    expect(result.prompts).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("handles wallet isolation — different wallets have different data", () => {
    const WALLET_B = "GDIFFERENT1234567890ABCDEFGH1234567890ABCDEFGH1234567";
    createCollection("Wallet A Collection", WALLET);
    createCollection("Wallet B Collection", WALLET_B);
    expect(listCollections(WALLET)).toHaveLength(1);
    expect(listCollections(WALLET_B)).toHaveLength(1);
    expect(listCollections(WALLET)[0].name).toBe("Wallet A Collection");
    expect(listCollections(WALLET_B)[0].name).toBe("Wallet B Collection");
  });

  it("removed prompt does not appear in removed-listing state", () => {
    const col = createCollection("Test", WALLET);
    addPromptToCollection(col.id, "prompt-to-remove", WALLET);
    addPromptToCollection(col.id, "prompt-keep", WALLET);
    removePromptFromCollection(col.id, "prompt-to-remove", WALLET);
    const ids = getCollection(col.id, WALLET)?.promptIds ?? [];
    expect(ids).not.toContain("prompt-to-remove");
    expect(ids).toContain("prompt-keep");
  });
});
