/**
 * Creator-curated public collections of prompt listings.
 *
 * Collections group active listings into shareable sets. Each collection
 * has a stable id, name, optional description, and an ordered list of
 * prompt ids. Only active, authorized prompts can be added.
 *
 * Storage is localStorage-backed per wallet address so collections follow
 * the connected creator wallet.
 */

export interface PromptCollection {
  id: string;
  name: string;
  description: string;
  promptIds: string[];
  createdAt: number;
  updatedAt: number;
  archived: boolean;
}

const COLLECTIONS_PREFIX = "prompt-mint:collections:v1";

function storageKey(walletAddress: string): string {
  return `${COLLECTIONS_PREFIX}:${walletAddress}`;
}

function safeRead(walletAddress: string): PromptCollection[] {
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PromptCollection[];
  } catch {
    return [];
  }
}

function safeWrite(
  collections: PromptCollection[],
  walletAddress: string,
): boolean {
  try {
    localStorage.setItem(
      storageKey(walletAddress),
      JSON.stringify(collections),
    );
    return true;
  } catch {
    return false;
  }
}

let idCounter = Date.now();

function generateId(): string {
  idCounter += 1;
  return `col-${idCounter.toString(36)}`;
}

/** Lists all collections for the given wallet. */
export function listCollections(walletAddress: string): PromptCollection[] {
  return safeRead(walletAddress);
}

/** Lists active (non-archived) collections. */
export function listActiveCollections(
  walletAddress: string,
): PromptCollection[] {
  return safeRead(walletAddress).filter((c) => !c.archived);
}

/** Gets a single collection by id. */
export function getCollection(
  collectionId: string,
  walletAddress: string,
): PromptCollection | undefined {
  return safeRead(walletAddress).find((c) => c.id === collectionId);
}

/** Creates a new collection. Returns the created collection. */
export function createCollection(
  name: string,
  walletAddress: string,
  description = "",
): PromptCollection {
  const now = Date.now();
  const collection: PromptCollection = {
    id: generateId(),
    name: name.trim(),
    description: description.trim(),
    promptIds: [],
    createdAt: now,
    updatedAt: now,
    archived: false,
  };
  const collections = safeRead(walletAddress);
  collections.push(collection);
  safeWrite(collections, walletAddress);
  return collection;
}

/** Renames a collection. Returns true on success. */
export function renameCollection(
  collectionId: string,
  newName: string,
  walletAddress: string,
): boolean {
  const collections = safeRead(walletAddress);
  const found = collections.find((c) => c.id === collectionId);
  if (!found) return false;
  found.name = newName.trim();
  found.updatedAt = Date.now();
  safeWrite(collections, walletAddress);
  return true;
}

/** Archives a collection (soft-delete). Returns true on success. */
export function archiveCollection(
  collectionId: string,
  walletAddress: string,
): boolean {
  const collections = safeRead(walletAddress);
  const found = collections.find((c) => c.id === collectionId);
  if (!found) return false;
  found.archived = true;
  found.updatedAt = Date.now();
  safeWrite(collections, walletAddress);
  return true;
}

/** Unarchives a previously archived collection. */
export function unarchiveCollection(
  collectionId: string,
  walletAddress: string,
): boolean {
  const collections = safeRead(walletAddress);
  const found = collections.find((c) => c.id === collectionId);
  if (!found) return false;
  found.archived = false;
  found.updatedAt = Date.now();
  safeWrite(collections, walletAddress);
  return true;
}

/** Deletes a collection permanently. */
export function deleteCollection(
  collectionId: string,
  walletAddress: string,
): boolean {
  const collections = safeRead(walletAddress);
  const idx = collections.findIndex((c) => c.id === collectionId);
  if (idx === -1) return false;
  collections.splice(idx, 1);
  safeWrite(collections, walletAddress);
  return true;
}

/** Adds a prompt id to a collection (no duplicates). Returns true on success. */
export function addPromptToCollection(
  collectionId: string,
  promptId: string,
  walletAddress: string,
): boolean {
  const collections = safeRead(walletAddress);
  const found = collections.find((c) => c.id === collectionId);
  if (!found) return false;
  if (found.promptIds.includes(promptId)) return true;
  found.promptIds.push(promptId);
  found.updatedAt = Date.now();
  safeWrite(collections, walletAddress);
  return true;
}

/** Removes a prompt id from a collection. Returns true on success. */
export function removePromptFromCollection(
  collectionId: string,
  promptId: string,
  walletAddress: string,
): boolean {
  const collections = safeRead(walletAddress);
  const found = collections.find((c) => c.id === collectionId);
  if (!found) return false;
  found.promptIds = found.promptIds.filter((id) => id !== promptId);
  found.updatedAt = Date.now();
  safeWrite(collections, walletAddress);
  return true;
}

/** Reorders a collection's prompt list. Returns true on success. */
export function reorderCollection(
  collectionId: string,
  promptIds: string[],
  walletAddress: string,
): boolean {
  const collections = safeRead(walletAddress);
  const found = collections.find((c) => c.id === collectionId);
  if (!found) return false;
  found.promptIds = promptIds;
  found.updatedAt = Date.now();
  safeWrite(collections, walletAddress);
  return true;
}

/**
 * Paginates a collection's prompt ids.
 * Returns a slice of the promptIds array.
 */
export function paginateCollection(
  collectionId: string,
  walletAddress: string,
  page = 1,
  perPage = 20,
): { prompts: string[]; total: number; page: number; totalPages: number } {
  const collection = getCollection(collectionId, walletAddress);
  if (!collection) {
    return { prompts: [], total: 0, page: 1, totalPages: 0 };
  }
  const total = collection.promptIds.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * perPage;
  const prompts = collection.promptIds.slice(start, start + perPage);
  return { prompts, total, page: safePage, totalPages };
}
