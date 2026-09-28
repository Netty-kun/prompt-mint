import Prompt from "../models/Prompt";
import Purchase from "../models/Purchase";
import User from "../models/User";
import MarketplaceTransaction, {
  type MarketplaceTransactionKind,
} from "../models/MarketplaceTransaction";
import { AppError } from "../lib/AppError";
import { normalizeStellarAddress } from "../lib/stellarAddress";

export interface TransactionHistoryRow {
  id: string;
  kind: MarketplaceTransactionKind;
  promptOnChainId: string;
  promptMongoId: string;
  promptTitle: string;
  buyerWallet: string;
  creatorWallet: string;
  priceStroops: number;
  txHash: string;
  occurredAt: string;
}

export interface TransactionHistoryResult {
  walletAddress: string;
  role: "buyer" | "creator";
  transactions: TransactionHistoryRow[];
}

export function assertValidWalletAddress(walletAddress: string): string {
  const normalized = normalizeStellarAddress(walletAddress);
  if (!normalized) {
    throw new AppError("Invalid Stellar wallet address.", 400, "INVALID_WALLET");
  }
  return normalized.toLowerCase();
}

function toRow(doc: {
  _id: unknown;
  kind?: MarketplaceTransactionKind;
  promptOnChainId: string;
  promptMongoId?: string;
  promptTitle?: string;
  buyerWallet: string;
  creatorWallet: string;
  priceStroops: number;
  txHash?: string;
  occurredAt: Date;
}): TransactionHistoryRow {
  return {
    id: String(doc._id),
    kind: doc.kind ?? "purchase",
    promptOnChainId: doc.promptOnChainId,
    promptMongoId: doc.promptMongoId ?? "",
    promptTitle: doc.promptTitle ?? "Prompt",
    buyerWallet: doc.buyerWallet,
    creatorWallet: doc.creatorWallet,
    priceStroops: doc.priceStroops,
    txHash: doc.txHash ?? "",
    occurredAt: doc.occurredAt.toISOString(),
  };
}

export async function listBuyerTransactionHistory(
  walletAddress: string,
): Promise<TransactionHistoryResult> {
  const buyerWallet = assertValidWalletAddress(walletAddress);

  const indexed = await MarketplaceTransaction.find({ buyerWallet })
    .sort({ occurredAt: -1 })
    .limit(200)
    .lean();

  if (indexed.length > 0) {
    return {
      walletAddress: buyerWallet,
      role: "buyer",
      transactions: indexed.map((doc) => toRow(doc as Parameters<typeof toRow>[0])),
    };
  }

  const purchases = await Purchase.find({ buyerWallet })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const promptIds = [...new Set(purchases.map((p) => p.promptId))];
  const prompts = await Prompt.find({ _id: { $in: promptIds } })
    .populate("owner", "walletAddress")
    .lean();
  const promptById = new Map(prompts.map((p) => [String(p._id), p]));

  const legacyRows: TransactionHistoryRow[] = purchases.map((purchase) => {
    const prompt = promptById.get(String(purchase.promptId));
    const ownerWallet =
      prompt && typeof prompt.owner === "object" && prompt.owner && "walletAddress" in prompt.owner
        ? String((prompt.owner as { walletAddress?: string }).walletAddress ?? "")
        : "";
    const priceStroops = prompt?.price != null ? Math.round(Number(prompt.price) * 10_000_000) : 0;

    return {
      id: String(purchase._id),
      kind: "purchase",
      promptOnChainId: prompt?.onChainId ?? String(purchase.promptId),
      promptMongoId: String(purchase.promptId),
      promptTitle: prompt?.title ?? "Prompt",
      buyerWallet: purchase.buyerWallet,
      creatorWallet: ownerWallet.toLowerCase(),
      priceStroops,
      txHash: purchase.txHash ?? "",
      occurredAt: (purchase.createdAt ?? new Date()).toISOString(),
    };
  });

  return {
    walletAddress: buyerWallet,
    role: "buyer",
    transactions: legacyRows,
  };
}

export async function listCreatorTransactionHistory(
  walletAddress: string,
): Promise<TransactionHistoryResult> {
  const creatorWallet = assertValidWalletAddress(walletAddress);

  const indexed = await MarketplaceTransaction.find({ creatorWallet })
    .sort({ occurredAt: -1 })
    .limit(200)
    .lean();

  if (indexed.length > 0) {
    return {
      walletAddress: creatorWallet,
      role: "creator",
      transactions: indexed.map((doc) => toRow(doc as Parameters<typeof toRow>[0])),
    };
  }

  const user = await User.findOne({ walletAddress: creatorWallet });
  if (!user) {
    return { walletAddress: creatorWallet, role: "creator", transactions: [] };
  }

  const ownedPrompts = await Prompt.find({ owner: user._id }).select("_id onChainId title price").lean();
  const ownedIds = ownedPrompts.map((p) => String(p._id));
  if (ownedIds.length === 0) {
    return { walletAddress: creatorWallet, role: "creator", transactions: [] };
  }

  const purchases = await Purchase.find({ promptId: { $in: ownedIds } })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const promptById = new Map(ownedPrompts.map((p) => [String(p._id), p]));

  const legacyRows: TransactionHistoryRow[] = purchases.map((purchase) => {
    const prompt = promptById.get(String(purchase.promptId));
    const priceStroops = prompt?.price != null ? Math.round(Number(prompt.price) * 10_000_000) : 0;

    return {
      id: String(purchase._id),
      kind: "purchase",
      promptOnChainId: prompt?.onChainId ?? String(purchase.promptId),
      promptMongoId: String(purchase.promptId),
      promptTitle: prompt?.title ?? "Prompt",
      buyerWallet: purchase.buyerWallet,
      creatorWallet,
      priceStroops,
      txHash: purchase.txHash ?? "",
      occurredAt: (purchase.createdAt ?? new Date()).toISOString(),
    };
  });

  return {
    walletAddress: creatorWallet,
    role: "creator",
    transactions: legacyRows,
  };
}

export interface RecordMarketplaceTransactionInput {
  promptOnChainId: string;
  buyerWallet: string;
  creatorWallet: string;
  priceStroops: number;
  txHash?: string;
  kind?: MarketplaceTransactionKind;
  ledger?: number;
  occurredAt?: Date;
  promptMongoId?: string;
  promptTitle?: string;
}

export async function recordMarketplaceTransaction(
  input: RecordMarketplaceTransactionInput,
): Promise<void> {
  const buyer = normalizeStellarAddress(input.buyerWallet);
  const creator = normalizeStellarAddress(input.creatorWallet);
  if (!buyer || !creator) {
    return;
  }

  const txHash = (input.txHash ?? "").trim();
  const filter =
    txHash.length > 0
      ? { buyerWallet: buyer.toLowerCase(), promptOnChainId: String(input.promptOnChainId), txHash }
      : {
          buyerWallet: buyer.toLowerCase(),
          promptOnChainId: String(input.promptOnChainId),
          occurredAt: input.occurredAt ?? new Date(),
        };

  await MarketplaceTransaction.findOneAndUpdate(
    filter,
    {
      $setOnInsert: {
        promptOnChainId: String(input.promptOnChainId),
        promptMongoId: input.promptMongoId ?? "",
        promptTitle: input.promptTitle ?? "Prompt",
        buyerWallet: buyer.toLowerCase(),
        creatorWallet: creator.toLowerCase(),
        priceStroops: input.priceStroops,
        txHash,
        kind: input.kind ?? "purchase",
        ledger: input.ledger ?? null,
        occurredAt: input.occurredAt ?? new Date(),
      },
    },
    { upsert: true, new: true },
  );
}
