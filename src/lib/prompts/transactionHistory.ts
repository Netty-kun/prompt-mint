export type MarketplaceTransactionKind = "purchase" | "license_transfer";

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

export interface TransactionHistoryResponse {
  walletAddress: string;
  role: "buyer" | "creator";
  transactions: TransactionHistoryRow[];
}

const parseJson = async <T>(response: Response): Promise<T> => {
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "Request failed")
        : "Request failed";
    const err = new Error(message) as Error & { status?: number; code?: string };
    err.status = response.status;
    if (payload && typeof payload === "object" && "code" in payload) {
      err.code = String((payload as { code?: unknown }).code);
    }
    throw err;
  }
  return payload as T;
};

export async function fetchBuyerTransactionHistory(
  walletAddress: string,
): Promise<TransactionHistoryResponse> {
  const response = await fetch(
    `/api/prompts/buyer/${encodeURIComponent(walletAddress)}/transactions`,
  );
  return parseJson<TransactionHistoryResponse>(response);
}

export async function fetchCreatorTransactionHistory(
  walletAddress: string,
): Promise<TransactionHistoryResponse> {
  const response = await fetch(
    `/api/prompts/creator/${encodeURIComponent(walletAddress)}/transactions`,
  );
  return parseJson<TransactionHistoryResponse>(response);
}
