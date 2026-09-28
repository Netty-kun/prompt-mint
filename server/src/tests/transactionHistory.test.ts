import { Keypair } from "@stellar/stellar-sdk";
import {
  assertValidWalletAddress,
  listBuyerTransactionHistory,
  listCreatorTransactionHistory,
} from "../services/transactionHistoryService";
import MarketplaceTransaction from "../models/MarketplaceTransaction";
import Purchase from "../models/Purchase";
import Prompt from "../models/Prompt";
import User from "../models/User";
import { AppError } from "../lib/AppError";

jest.mock("../models/MarketplaceTransaction");
jest.mock("../models/Purchase");
jest.mock("../models/Prompt");
jest.mock("../models/User");

describe("transactionHistoryService", () => {
  let buyerKey: Keypair;

  beforeEach(() => {
    jest.resetAllMocks();
    buyerKey = Keypair.random();
  });

  it("rejects invalid wallet addresses", () => {
    expect(() => assertValidWalletAddress("not-a-wallet")).toThrow(AppError);
    try {
      assertValidWalletAddress("not-a-wallet");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).httpStatus).toBe(400);
      expect((error as AppError).code).toBe("INVALID_WALLET");
    }
  });

  it("returns indexed buyer transactions when present", async () => {
    const wallet = buyerKey.publicKey();
    (MarketplaceTransaction.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: "tx-1",
              kind: "purchase",
              promptOnChainId: "42",
              promptMongoId: "mongo-1",
              promptTitle: "Test prompt",
              buyerWallet: wallet.toLowerCase(),
              creatorWallet: "gcreator",
              priceStroops: 5_000_000,
              txHash: "abc123",
              occurredAt: new Date("2026-01-01T00:00:00.000Z"),
            },
          ]),
        }),
      }),
    });

    const result = await listBuyerTransactionHistory(wallet);
    expect(result.role).toBe("buyer");
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].promptTitle).toBe("Test prompt");
  });

  it("falls back to legacy purchases when no indexed rows exist", async () => {
    const wallet = buyerKey.publicKey();
    (MarketplaceTransaction.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    (Purchase.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([
            {
              _id: "purchase-1",
              promptId: "prompt-mongo",
              buyerWallet: wallet.toLowerCase(),
              txHash: "legacy-tx",
              createdAt: new Date("2026-02-01T00:00:00.000Z"),
            },
          ]),
        }),
      }),
    });

    (Prompt.find as jest.Mock).mockReturnValue({
      populate: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([
          {
            _id: "prompt-mongo",
            onChainId: "99",
            title: "Legacy prompt",
            price: 2.5,
            owner: { walletAddress: Keypair.random().publicKey() },
          },
        ]),
      }),
    });

    const result = await listBuyerTransactionHistory(wallet);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].promptOnChainId).toBe("99");
    expect(result.transactions[0].txHash).toBe("legacy-tx");
  });

  it("returns empty creator history when user is unknown", async () => {
    const creator = Keypair.random().publicKey();
    (MarketplaceTransaction.find as jest.Mock).mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      }),
    });
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const result = await listCreatorTransactionHistory(creator);
    expect(result.transactions).toEqual([]);
  });
});
