import { useCallback, useEffect, useState } from "react";
import {
  addToComparison,
  removeFromComparison,
  toggleComparison,
  isSelected as isSelectedFn,
  canAdd as canAddFn,
  canView as canViewFn,
  type ComparisonPrompt,
} from "@/lib/comparison/state";

/**
 * #277 – Comparison selection persisted to localStorage.
 *
 * Transient UI selections elsewhere in this app (cart, drafts) are kept in
 * localStorage, so the compare tray on /browse and the /compare page share the
 * same store. A custom event keeps multiple hook instances in the same tab in
 * sync (the native `storage` event only fires across tabs).
 */
const STORAGE_KEY = "prompt-hash:comparison";
const SYNC_EVENT = "prompt-hash:comparison-changed";

function read(): ComparisonPrompt[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ComparisonPrompt[]) : [];
  } catch {
    return [];
  }
}

function write(list: ComparisonPrompt[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT));
  } catch {
    // ignore quota / serialization failures — comparison is non-critical UI
  }
}

export function useComparison() {
  const [selected, setSelected] = useState<ComparisonPrompt[]>(() =>
    typeof window === "undefined" ? [] : read(),
  );

  useEffect(() => {
    const sync = () => setSelected(read());
    window.addEventListener(SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((next: ComparisonPrompt[]) => {
    write(next);
    setSelected(next);
  }, []);

  const add = useCallback(
    (prompt: ComparisonPrompt) => update(addToComparison(read(), prompt)),
    [update],
  );
  const remove = useCallback(
    (id: string) => update(removeFromComparison(read(), id)),
    [update],
  );
  const toggle = useCallback(
    (prompt: ComparisonPrompt) => update(toggleComparison(read(), prompt)),
    [update],
  );
  const clear = useCallback(() => update([]), [update]);

  return {
    selected,
    add,
    remove,
    toggle,
    clear,
    isSelected: (id: string) => isSelectedFn(selected, id),
    canAdd: canAddFn(selected),
    canView: canViewFn(selected),
  };
}
