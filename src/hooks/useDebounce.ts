import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delayMs`
 * milliseconds have elapsed without `value` changing. Used by the marketplace
 * search box (#276) to avoid re-filtering the catalog on every keystroke.
 *
 * @param value   The rapidly-changing source value (e.g. the raw input string).
 * @param delayMs Debounce delay in milliseconds. Defaults to 300ms.
 */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

export default useDebounce;
