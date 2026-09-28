import { describe, expect, it } from "vitest";
import {
  CREATOR_REPUTATION_VERSION,
  calculateCreatorReputation,
  deriveCreatorActivity,
} from "./creatorReputation";

describe("creator reputation v1", () => {
  it("presents creators without enough sales as new, not unsafe", () => {
    const result = calculateCreatorReputation({
      accountCreatedAt: "2026-08-20T00:00:00.000Z",
      completedSales: 1,
      upheldDisputes: 1,
      verifiedLinks: [],
      calculatedAt: "2026-08-25T00:00:00.000Z",
    });

    expect(result.version).toBe(CREATOR_REPUTATION_VERSION);
    expect(result.accountAgeDays).toBe(5);
    expect(result.historyStatus).toBe("new");
    expect(result.historyLabel).toContain("building marketplace history");
    expect(result.disputeRate).toBeNull();
  });

  it("calculates a bounded dispute rate only after sufficient history", () => {
    const result = calculateCreatorReputation({
      accountCreatedAt: "2026-01-01T00:00:00.000Z",
      completedSales: 20,
      upheldDisputes: 2,
      verifiedLinks: [],
      calculatedAt: "2026-08-25T00:00:00.000Z",
    });

    expect(result.historyStatus).toBe("established");
    expect(result.disputeRate).toBe(10);
  });

  it("shows only links carrying verification evidence", () => {
    const result = calculateCreatorReputation({
      accountCreatedAt: null,
      completedSales: 0,
      upheldDisputes: 0,
      verifiedLinks: [
        {
          label: "Portfolio",
          url: "https://creator.example",
          verifiedAt: "2026-08-20T00:00:00.000Z",
          verificationMethod: "domain-challenge",
        },
        {
          label: "Editable claim",
          url: "http://unsafe.example",
          verifiedAt: "",
          verificationMethod: "",
        },
      ],
    });

    expect(result.verifiedLinks).toHaveLength(1);
    expect(result.verifiedLinks[0].label).toBe("Portfolio");
  });

  it("resists self-dealing, duplicate sales, and ineligible disputes", () => {
    const activity = deriveCreatorActivity({
      creatorAddress: "GCREATOR",
      promptIds: ["1"],
      indexedOnChainSales: 10,
      purchases: [
        { promptId: "1", buyerWallet: "GCREATOR", txHash: "self" },
        { promptId: "1", buyerWallet: "GBUYER", txHash: "tx-1" },
        { promptId: "1", buyerWallet: "GBUYER", txHash: "tx-duplicate" },
        { promptId: "1", buyerWallet: "GNOHASH", txHash: "" },
      ],
      disputes: [
        { promptId: "1", reporterAddress: "GBUYER", resolution: "upheld" },
        { promptId: "1", reporterAddress: "GSTRANGER", resolution: "upheld" },
        { promptId: "1", reporterAddress: "GBUYER", resolution: "dismissed" },
      ],
    });

    expect(activity).toEqual({ completedSales: 1, upheldDisputes: 1 });
  });
});
