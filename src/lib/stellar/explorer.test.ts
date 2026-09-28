import { describe, expect, it, vi, afterEach } from "vitest";
import { buildTransactionExplorerUrl } from "./explorer";

describe("buildTransactionExplorerUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns null for empty hash", () => {
    expect(buildTransactionExplorerUrl("")).toBeNull();
    expect(buildTransactionExplorerUrl("   ")).toBeNull();
  });

  it("builds a testnet explorer link by default", () => {
    const url = buildTransactionExplorerUrl("deadbeef");
    expect(url).toContain("stellar.expert/explorer/testnet/tx/deadbeef");
  });
});
