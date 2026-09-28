import type { PromptRecord } from "@/lib/stellar/promptHashClient";

/**
 * #276 – Marketplace search: pure helpers for full-text filtering and for
 * persisting recent searches. Kept free of React so they can be unit-tested
 * directly.
 */

/** Versioned localStorage key. Bump the version suffix on a shape change. */
export const SEARCH_HISTORY_KEY = "prompt-mint:search-history:v1";

/** Maximum number of recent searches retained. */
export const SEARCH_HISTORY_LIMIT = 10;

/**
 * Case-insensitive full-text match across a prompt's title, description,
 * preview text, category, creator, and tags. An empty/whitespace query matches
 * everything.
 */
export function promptMatchesSearch(prompt: PromptRecord, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystacks: string[] = [
    prompt.title,
    prompt.category,
    prompt.previewText,
    prompt.description ?? "",
    prompt.creator,
    ...(prompt.tags ?? []),
  ];

  return haystacks.some((field) =>
    (field ?? "").toLowerCase().includes(normalized),
  );
}

/** Filters a list of prompts by the search query using {@link promptMatchesSearch}. */
export function filterPromptsBySearch(
  prompts: PromptRecord[],
  query: string,
): PromptRecord[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return prompts;
  return prompts.filter((prompt) => promptMatchesSearch(prompt, normalized));
}

/**
 * Normalizes and de-duplicates a raw list of history entries, applying the
 * length cap. Most-recent-first ordering is preserved. Exported for testing.
 */
export function normalizeHistory(entries: unknown): string[] {
  if (!Array.isArray(entries)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of entries) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
    if (result.length >= SEARCH_HISTORY_LIMIT) break;
  }
  return result;
}

/**
 * Returns the history with `term` promoted to the front, de-duplicated
 * (case-insensitively) and capped. Pure — does not touch storage. An
 * empty/whitespace term returns the history unchanged.
 */
export function addSearchTerm(history: string[], term: string): string[] {
  const trimmed = term.trim();
  if (!trimmed) return normalizeHistory(history);
  return normalizeHistory([trimmed, ...history]);
}

function isStorageAvailable(): boolean {
  try {
    return typeof window !== "undefined" && !!window.localStorage;
  } catch {
    return false;
  }
}

/** Loads the persisted recent searches, returning [] on any error. */
export function loadSearchHistory(): string[] {
  if (!isStorageAvailable()) return [];
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    return normalizeHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Persists the given history (normalized/capped). Returns the stored list. */
export function saveSearchHistory(history: string[]): string[] {
  const normalized = normalizeHistory(history);
  if (!isStorageAvailable()) return normalized;
  try {
    window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota / serialization errors */
  }
  return normalized;
}

/** Adds a term to the persisted history and returns the updated list. */
export function recordSearchTerm(term: string): string[] {
  return saveSearchHistory(addSearchTerm(loadSearchHistory(), term));
}

/** Clears the persisted recent searches. */
export function clearSearchHistory(): void {
  if (!isStorageAvailable()) return;
  try {
    window.localStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    /* ignore */
  }
}
