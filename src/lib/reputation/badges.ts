export type ReputationBadgeKey =
  | "verified-creator"
  | "early-adopter"
  | "top-seller";

export interface ReputationBadge {
  key: ReputationBadgeKey;
  label: string;
  description: string;
}

export interface ReputationBadgeInput {
  verifiedLinks: unknown[];
  accountCreatedAt: string | null;
  completedSales: number;
}

const EARLY_ADOPTER_DAYS = 180;
const TOP_SELLER_MIN_SALES = 5;

export const REPUTATION_BADGES: Record<ReputationBadgeKey, ReputationBadge> = {
  "verified-creator": {
    key: "verified-creator",
    label: "Verified Creator",
    description: "This creator has verified at least one external link.",
  },
  "early-adopter": {
    key: "early-adopter",
    label: "Early Adopter",
    description: "Active on Prompt Mint for at least 180 days.",
  },
  "top-seller": {
    key: "top-seller",
    label: "Top Seller",
    description: "Completed at least 5 sales.",
  },
};

export function computeReputationBadges(
  input: ReputationBadgeInput,
): ReputationBadge[] {
  const badges: ReputationBadge[] = [];

  if (input.verifiedLinks.length > 0) {
    badges.push(REPUTATION_BADGES["verified-creator"]);
  }

  const ageDays = accountAgeInDays(input.accountCreatedAt);
  if (ageDays !== null && ageDays >= EARLY_ADOPTER_DAYS) {
    badges.push(REPUTATION_BADGES["early-adopter"]);
  }

  if (input.completedSales >= TOP_SELLER_MIN_SALES) {
    badges.push(REPUTATION_BADGES["top-seller"]);
  }

  return badges;
}

export function accountAgeInDays(accountCreatedAt: string | null): number | null {
  if (!accountCreatedAt) return null;
  const created = Date.parse(accountCreatedAt);
  if (Number.isNaN(created)) return null;
  return Math.floor((Date.now() - created) / 86_400_000);
}
