import { describe, it, expect, vi } from "vitest";
import { runBatchOperation } from "./batchOperations";

describe("runBatchOperation", () => {
  it("applies the operation to every id in order", async () => {
    const seen: string[] = [];
    const summary = await runBatchOperation(["1", "2", "3"], async (id) => {
      seen.push(id);
    });
    expect(seen).toEqual(["1", "2", "3"]);
    expect(summary.successCount).toBe(3);
    expect(summary.failureCount).toBe(0);
  });

  it("captures per-item failures without aborting the batch", async () => {
    const summary = await runBatchOperation(["1", "2", "3"], async (id) => {
      if (id === "2") throw new Error("boom");
    });
    expect(summary.successCount).toBe(2);
    expect(summary.failureCount).toBe(1);
    const failed = summary.results.find((r) => !r.ok);
    expect(failed).toMatchObject({ id: "2", ok: false, error: "boom" });
  });

  it("reports progress after each item", async () => {
    const onProgress = vi.fn();
    await runBatchOperation(["a", "b"], async () => {}, onProgress);
    expect(onProgress).toHaveBeenCalledTimes(2);
    expect(onProgress).toHaveBeenLastCalledWith({
      completed: 2,
      total: 2,
      id: "b",
      ok: true,
    });
  });

  it("handles an empty selection", async () => {
    const summary = await runBatchOperation([], async () => {});
    expect(summary.results).toEqual([]);
    expect(summary.successCount).toBe(0);
  });
});
