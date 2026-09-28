/**
 * Sequential batch runner for creator bulk actions (#286).
 *
 * Contract mutations in this repo are executed one signature at a time (each
 * requires a wallet prompt), so batch actions are applied sequentially rather
 * than via Promise.all. Per-item failures are captured so a single rejected
 * transaction does not abort the remaining items, and a progress callback
 * drives UI feedback.
 */

export interface BatchItemResult {
  id: string;
  ok: boolean;
  error?: string;
}

export interface BatchRunSummary {
  results: BatchItemResult[];
  successCount: number;
  failureCount: number;
}

export interface BatchProgress {
  /** Number of items completed (success or failure). */
  completed: number;
  total: number;
  /** The id just processed. */
  id: string;
  ok: boolean;
}

export async function runBatchOperation(
  ids: string[],
  operation: (id: string) => Promise<void>,
  onProgress?: (progress: BatchProgress) => void,
): Promise<BatchRunSummary> {
  const results: BatchItemResult[] = [];
  const total = ids.length;

  for (let index = 0; index < ids.length; index += 1) {
    const id = ids[index];
    let ok = true;
    let error: string | undefined;
    try {
      await operation(id);
    } catch (err) {
      ok = false;
      error = err instanceof Error ? err.message : "Operation failed.";
    }
    results.push({ id, ok, error });
    onProgress?.({ completed: index + 1, total, id, ok });
  }

  const successCount = results.filter((r) => r.ok).length;
  return {
    results,
    successCount,
    failureCount: results.length - successCount,
  };
}
