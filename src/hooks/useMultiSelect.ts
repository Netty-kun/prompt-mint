import { useCallback, useMemo, useState } from "react";

/**
 * Generic multi-select selection state for list/grid rows (#286).
 *
 * Selection is tracked as a Set of string ids. The hook is intentionally
 * decoupled from the item shape so it can be unit tested in isolation and
 * reused by any batch-management surface.
 */
export interface UseMultiSelectResult {
  /** Currently selected ids, in insertion order. */
  selectedIds: string[];
  selectedCount: number;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  /** Select every id in `allIds` (union with current selection). */
  selectAll: (allIds: string[]) => void;
  clear: () => void;
  /**
   * True when every id in `allIds` is selected and `allIds` is non-empty.
   * Useful for a header "select all" checkbox.
   */
  isAllSelected: (allIds: string[]) => boolean;
}

export function useMultiSelect(
  initial: string[] = [],
): UseMultiSelectResult {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initial),
  );

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected],
  );

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const select = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const deselect = useCallback((id: string) => {
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of allIds) next.add(id);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setSelected((prev) => (prev.size === 0 ? prev : new Set<string>()));
  }, []);

  const isAllSelected = useCallback(
    (allIds: string[]) =>
      allIds.length > 0 && allIds.every((id) => selected.has(id)),
    [selected],
  );

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    isSelected,
    toggle,
    select,
    deselect,
    selectAll,
    clear,
    isAllSelected,
  };
}
