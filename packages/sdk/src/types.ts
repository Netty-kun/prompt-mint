/** SDK configuration — Issue #110 */

export interface ClientConfig {
  /** PromptHash backend API base URL */
  apiUrl: string;
  /** Stellar network: "testnet" | "mainnet" */
  network?: "testnet" | "mainnet";
  /**
   * API version to request via the Accept-Version header.
   * Defaults to "latest" (server picks CURRENT_API_VERSION).
   * Pin to a specific date string (e.g. "2025-01-01") for stability.
   */
  apiVersion?: string;
}

export interface PromptInfo {
  id: string;
  title: string;
  image: string;
  rating: number;
  upvotes: number;
  owner: string;
  priceUSDC?: number;
}

export interface PurchaseResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface VoteResult {
  success: boolean;
  upvotes: number;
}

/**
 * Every successful API response envelope includes this field.
 * Clients can use it to confirm which schema version was served.
 */
export interface VersionedApiResponse {
  /** Stable date-string identifying the response payload schema. */
  apiVersion: string;
}

/**
 * Shape of a webhook delivery body sent to registered endpoints.
 * Receivers should check `schemaVersion` before processing `data`.
 */
export interface WebhookDelivery {
  /** Stable date-string identifying the webhook payload schema. */
  schemaVersion: string;
  /** Event type name (e.g. "PromptPurchased"). */
  event: string;
  /** UUID unique to this delivery attempt. */
  deliveryId: string;
  /** ISO-8601 UTC timestamp of when the event was dispatched. */
  timestamp: string;
  /** Event-specific payload. Shape depends on `event` type. */
  data: Record<string, unknown>;
}
