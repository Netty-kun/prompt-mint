import { describe, expect, it, vi, afterEach } from "vitest";
import {
  fetchBuyerTransactionHistory,
  fetchCreatorTransactionHistory,
} from "./transactionHistory";

const wallet =
  "GBUYERACCOUNT1234567890ABCDEFGH1234567890ABCDEFGH123456789";

describe("transactionHistory client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("loads buyer transaction history", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            walletAddress: wallet,
            role: "buyer",
            transactions: [
              {
                id: "1",
                kind: "purchase",
                promptOnChainId: "7",
                promptMongoId: "",
                promptTitle: "Pack",
                buyerWallet: wallet,
                creatorWallet: "GCREATOR1234567890ABCDEFGH1234567890ABCDEFGH1234567890AB",
                priceStroops: 10_000_000,
                txHash: "tx-hash",
                occurredAt: "2026-01-01T00:00:00.000Z",
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    );

    const result = await fetchBuyerTransactionHistory(wallet);
    expect(result.transactions).toHaveLength(1);
    expect(fetch).toHaveBeenCalledWith(
      `/api/prompts/buyer/${encodeURIComponent(wallet)}/transactions`,
    );
  });

  it("surfaces API errors for invalid wallet requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Invalid Stellar wallet address." }), {
          status: 400,
        }),
      ),
    );

    await expect(fetchCreatorTransactionHistory("bad")).rejects.toThrow(
      /invalid stellar wallet/i,
    );
  });
});
