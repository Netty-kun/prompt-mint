import { screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { TransactionHistoryPanel } from "./TransactionHistoryPanel";
import { renderWithProviders } from "@/test/render";

const wallet =
  "GBUYERACCOUNT1234567890ABCDEFGH1234567890ABCDEFGH123456789";

describe("TransactionHistoryPanel", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders buyer transactions from the API", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        JSON.stringify({
          walletAddress: wallet,
          role: "buyer",
          transactions: [
            {
              id: "row-1",
              kind: "purchase",
              promptOnChainId: "3",
              promptMongoId: "",
              promptTitle: "Launch pack",
              buyerWallet: wallet,
              creatorWallet: "GCREATOR1234567890ABCDEFGH1234567890ABCDEFGH1234567890AB",
              priceStroops: 20_000_000,
              txHash: "stellar-tx",
              occurredAt: "2026-03-01T12:00:00.000Z",
            },
          ],
        }),
        { status: 200 },
      ),
    );

    renderWithProviders(
      <TransactionHistoryPanel
        walletAddress={wallet}
        role="buyer"
        title="Purchase history"
        description="Test"
        emptyMessage="Empty"
      />,
    );

    expect(await screen.findByText("Launch pack")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /on-chain tx/i })).toHaveAttribute(
      "href",
      expect.stringContaining("stellar-tx"),
    );
  });

  it("shows an error banner when the API fails", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "Service unavailable" }), { status: 503 }),
    );

    renderWithProviders(
      <TransactionHistoryPanel
        walletAddress={wallet}
        role="buyer"
        title="Purchase history"
        description="Test"
        emptyMessage="Empty"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/service unavailable/i);
    });
  });
});
