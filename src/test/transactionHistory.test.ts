import { describe, it, expect, beforeEach } from "vitest";
import {
  getTransactions,
  recordTransaction,
  removeTransaction,
  clearTransactions,
  filterTransactions,
  type TransactionRecord,
} from "@/lib/history/transactions";

const WALLET = "GABC123";

function makeTx(overrides: Partial<TransactionRecord> = {}): TransactionRecord {
  return {
    id: overrides.id ?? "tx-1",
    type: overrides.type ?? "purchase",
    status: overrides.status ?? "success",
    timestamp: overrides.timestamp ?? Date.now(),
    ...overrides,
  };
}

describe("transaction history storage (#278)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("records and retrieves a transaction", () => {
    expect(recordTransaction(WALLET, makeTx({ id: "a" }))).toBe(true);
    const list = getTransactions(WALLET);
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("a");
  });

  it("isolates history per wallet", () => {
    recordTransaction(WALLET, makeTx({ id: "a" }));
    expect(getTransactions("GOTHER")).toHaveLength(0);
  });

  it("returns transactions newest first", () => {
    recordTransaction(WALLET, makeTx({ id: "old", timestamp: 1000 }));
    recordTransaction(WALLET, makeTx({ id: "new", timestamp: 2000 }));
    const list = getTransactions(WALLET);
    expect(list.map((t) => t.id)).toEqual(["new", "old"]);
  });

  it("upserts by id instead of duplicating (pending -> success)", () => {
    recordTransaction(WALLET, makeTx({ id: "x", status: "pending" }));
    recordTransaction(
      WALLET,
      makeTx({ id: "x", status: "success", txHash: "HASH" })
    );
    const list = getTransactions(WALLET);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("success");
    expect(list[0].txHash).toBe("HASH");
  });

  it("removes a single transaction", () => {
    recordTransaction(WALLET, makeTx({ id: "a" }));
    recordTransaction(WALLET, makeTx({ id: "b" }));
    expect(removeTransaction(WALLET, "a")).toBe(true);
    expect(getTransactions(WALLET).map((t) => t.id)).toEqual(["b"]);
  });

  it("clears all transactions", () => {
    recordTransaction(WALLET, makeTx({ id: "a" }));
    expect(clearTransactions(WALLET)).toBe(true);
    expect(getTransactions(WALLET)).toHaveLength(0);
  });

  it("persists across reads (round-trip through localStorage)", () => {
    recordTransaction(WALLET, makeTx({ id: "a", amountStroops: "5000000" }));
    // Fresh read simulates a reload
    const list = getTransactions(WALLET);
    expect(list[0].amountStroops).toBe("5000000");
  });
});

describe("filterTransactions (#278)", () => {
  const records: TransactionRecord[] = [
    makeTx({ id: "p", type: "purchase", status: "success", timestamp: 1000 }),
    makeTx({ id: "s", type: "sale", status: "pending", timestamp: 2000 }),
    makeTx({ id: "t", type: "transfer", status: "failed", timestamp: 3000 }),
  ];

  it("filters by type", () => {
    expect(filterTransactions(records, { type: "sale" }).map((r) => r.id)).toEqual([
      "s",
    ]);
  });

  it("filters by status", () => {
    expect(
      filterTransactions(records, { status: "failed" }).map((r) => r.id)
    ).toEqual(["t"]);
  });

  it("filters by date range (inclusive)", () => {
    expect(
      filterTransactions(records, {
        fromTimestamp: 1500,
        toTimestamp: 2500,
      }).map((r) => r.id)
    ).toEqual(["s"]);
  });

  it("treats 'all' as no filter", () => {
    expect(
      filterTransactions(records, { type: "all", status: "all" })
    ).toHaveLength(3);
  });
});
