/**
 * Bookmark / favorites storage (#284).
 *
 * Self-contained, localStorage-backed favorites primitive. The marketplace
 * already ships a server-backed "saved prompts" feature (see
 * lib/marketplace/saveApi + FetchAllPrompts), which is wallet-gated. This
 * module is the issue's requested self-contained alternative: it works
 * without a wallet or backend and is fully unit-testable.
 *
 * Storage uses a versioned key per wallet so state is scoped to the
 * connected wallet address and survives refresh. When the wallet is
 * disconnected or switching, the key changes transparently.
 */

export const BOOKMARKS_STORAGE_PREFIX = "prompt-mint:bookmarks:v2";

function storageKey(walletAddress?: string): string {
  return walletAddress
    ? `${BOOKMARKS_STORAGE_PREFIX}:${walletAddress}`
    : BOOKMARKS_STORAGE_PREFIX;
}

function safeRead(walletAddress?: string): string[] {
  try {
    const raw = localStorage.getItem(storageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return Array.from(new Set(parsed.map((v) => String(v))));
  } catch {
    return [];
  }
}

function safeWrite(ids: string[], walletAddress?: string): boolean {
  try {
    localStorage.setItem(
      storageKey(walletAddress),
      JSON.stringify(Array.from(new Set(ids))),
    );
    return true;
  } catch {
    return false;
  }
}

/** Returns all bookmarked prompt ids for the given wallet (or anonymous). */
export function listBookmarks(walletAddress?: string): string[] {
  return safeRead(walletAddress);
}

/** Whether a prompt id is bookmarked for the given wallet. */
export function isBookmarked(promptId: string, walletAddress?: string): boolean {
  return safeRead(walletAddress).includes(promptId);
}

/** Adds a bookmark (idempotent). Returns the new list. */
export function addBookmark(promptId: string, walletAddress?: string): string[] {
  const ids = safeRead(walletAddress);
  if (!ids.includes(promptId)) {
    ids.push(promptId);
    safeWrite(ids, walletAddress);
  }
  return ids;
}

/** Removes a bookmark (idempotent). Returns the new list. */
export function removeBookmark(promptId: string, walletAddress?: string): string[] {
  const next = safeRead(walletAddress).filter((id) => id !== promptId);
  safeWrite(next, walletAddress);
  return next;
}

/** Toggles a bookmark. Returns true if now bookmarked, false otherwise. */
export function toggleBookmark(promptId: string, walletAddress?: string): boolean {
  if (isBookmarked(promptId, walletAddress)) {
    removeBookmark(promptId, walletAddress);
    return false;
  }
  addBookmark(promptId, walletAddress);
  return true;
}

/** Number of prompts the current user has bookmarked. */
export function bookmarkCount(walletAddress?: string): number {
  return safeRead(walletAddress).length;
}

/** Clears all bookmarks for the given wallet. */
export function clearBookmarks(walletAddress?: string): boolean {
  try {
    localStorage.removeItem(storageKey(walletAddress));
    return true;
  } catch {
    return false;
  }
}
