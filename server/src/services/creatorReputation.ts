export const CREATOR_REPUTATION_VERSION = "creator-reputation-v1";
export const MIN_SALES_FOR_HISTORY = 3;

export interface VerifiedCreatorLink {
  label: string;
  url: string;
  verifiedAt: string;
  verificationMethod: string;
}

export interface CreatorReputationInput {
  accountCreatedAt: string | null;
  completedSales: number;
  upheldDisputes: number;
  verifiedLinks: VerifiedCreatorLink[];
  calculatedAt?: string;
}

export interface MarketplacePurchaseEvidence {
  promptId: string;
  buyerWallet: string;
  txHash: string;
}

export interface MarketplaceDisputeEvidence {
  promptId: string;
  reporterAddress: string;
  resolution: string | null;
}

const nonNegativeInteger = (value: number) =>
  Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

export function deriveCreatorActivity(input: {
  creatorAddress: string;
  promptIds: string[];
  indexedOnChainSales: number;
  purchases: MarketplacePurchaseEvidence[];
  disputes: MarketplaceDisputeEvidence[];
}) {
  const creator = input.creatorAddress.toLowerCase();
  const promptIds = new Set(input.promptIds.map(String));
  const eligiblePurchases = new Set<string>();

  for (const purchase of input.purchases) {
    const promptId = String(purchase.promptId);
    const buyer = purchase.buyerWallet.toLowerCase();
    if (
      promptIds.has(promptId) &&
      buyer !== creator &&
      purchase.txHash.trim().length > 0
    ) {
      eligiblePurchases.add(`${promptId}:${buyer}`);
    }
  }

  const completedSales = Math.min(
    nonNegativeInteger(input.indexedOnChainSales),
    eligiblePurchases.size,
  );
  const upheldDisputes = new Set(
    input.disputes
      .filter((dispute) => {
        const evidenceKey = `${String(dispute.promptId)}:${dispute.reporterAddress.toLowerCase()}`;
        return (
          dispute.resolution === "upheld" && eligiblePurchases.has(evidenceKey)
        );
      })
      .map(
        (dispute) =>
          `${String(dispute.promptId)}:${dispute.reporterAddress.toLowerCase()}`,
      ),
  ).size;

  return {
    completedSales,
    upheldDisputes: Math.min(completedSales, upheldDisputes),
  };
}

export function calculateCreatorReputation(input: CreatorReputationInput) {
  const calculatedAt = input.calculatedAt ?? new Date().toISOString();
  const calculatedAtMs = Date.parse(calculatedAt);
  const createdAtMs = input.accountCreatedAt
    ? Date.parse(input.accountCreatedAt)
    : Number.NaN;
  const accountAgeDays =
    Number.isFinite(createdAtMs) && Number.isFinite(calculatedAtMs)
      ? Math.max(0, Math.floor((calculatedAtMs - createdAtMs) / 86_400_000))
      : null;
  const completedSales = nonNegativeInteger(input.completedSales);
  const upheldDisputes = Math.min(
    completedSales,
    nonNegativeInteger(input.upheldDisputes),
  );
  const hasHistory = completedSales >= MIN_SALES_FOR_HISTORY;

  return {
    version: CREATOR_REPUTATION_VERSION,
    calculatedAt,
    accountCreatedAt: Number.isFinite(createdAtMs)
      ? new Date(createdAtMs).toISOString()
      : null,
    accountAgeDays,
    completedSales,
    upheldDisputes,
    disputeRate: hasHistory
      ? Number(((upheldDisputes / completedSales) * 100).toFixed(1))
      : null,
    historyStatus: hasHistory ? ("established" as const) : ("new" as const),
    historyLabel: hasHistory
      ? "Marketplace history available"
      : "New creator — building marketplace history",
    verifiedLinks: input.verifiedLinks.filter(
      (link) =>
        link.label.trim().length > 0 &&
        link.verificationMethod.trim().length > 0 &&
        Number.isFinite(Date.parse(link.verifiedAt)) &&
        link.url.startsWith("https://"),
    ),
  };
}
