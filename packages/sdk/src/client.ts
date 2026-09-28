/**
 * PromptHashClient — Issue #110
 *
 * Main SDK class. Wraps PromptHash REST API calls and provides typed helpers
 * for fetching prompts, buying licenses, verifying ownership, and voting.
 */

import type { ClientConfig, PromptInfo, PurchaseResult, VoteResult } from "./types.js";

export class PromptHashClient {
  private readonly apiUrl: string;
  private readonly network: "testnet" | "mainnet";
  private readonly apiVersion: string;

  constructor(config: ClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, "");
    this.network = config.network ?? "testnet";
    this.apiVersion = config.apiVersion ?? "latest";
  }

  // ── Internal helpers ────────────────────────────────────────────────────────

  /**
   * Build the base request headers for every API call.
   * Includes the Accept-Version header so the server returns the schema
   * version that this client was configured for.
   */
  private baseHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Accept-Version": this.apiVersion,
    };
  }

  // ── Prompt queries ──────────────────────────────────────────────────────────

  /**
   * Fetch a paginated list of prompts.
   * @param params.page  Page number (1-based, default 1)
   * @param params.limit Items per page (default 20, max 100)
   * @param params.sort  Sort field: "upvotes" | "rating" | "createdAt"
   */
  async listPrompts(params: {
    page?: number;
    limit?: number;
    sort?: "upvotes" | "rating" | "createdAt";
  } = {}): Promise<PromptInfo[]> {
    const qs = new URLSearchParams({
      page: String(params.page ?? 1),
      limit: String(Math.min(params.limit ?? 20, 100)),
      ...(params.sort ? { sort: params.sort } : {}),
    });
    const res = await fetch(`${this.apiUrl}/api/prompts?${qs}`, {
      headers: this.baseHeaders(),
    });
    if (!res.ok) throw new Error(`listPrompts failed: ${res.status}`);
    const data = await res.json() as { prompts?: PromptInfo[] } | PromptInfo[];
    return Array.isArray(data) ? data : (data.prompts ?? []);
  }

  /**
   * Fetch a single prompt by ID.
   */
  async getPrompt(promptId: string): Promise<PromptInfo> {
    const res = await fetch(`${this.apiUrl}/api/prompts/${promptId}`, {
      headers: this.baseHeaders(),
    });
    if (!res.ok) throw new Error(`getPrompt failed: ${res.status}`);
    return res.json() as Promise<PromptInfo>;
  }

  // ── License verification ────────────────────────────────────────────────────

  /**
   * Check whether `buyerWallet` has purchased a license for `promptId`.
   */
  async hasLicense(promptId: string, buyerWallet: string): Promise<boolean> {
    const res = await fetch(
      `${this.apiUrl}/api/prompts/${promptId}/license?wallet=${encodeURIComponent(buyerWallet)}`,
      { headers: this.baseHeaders() },
    );
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`hasLicense failed: ${res.status}`);
    const data = await res.json() as { licensed?: boolean };
    return data.licensed ?? false;
  }

  // ── Purchase flow ───────────────────────────────────────────────────────────

  /**
   * Submit a purchase record after the on-chain transaction is confirmed.
   * The caller is responsible for signing and broadcasting the Stellar transaction.
   *
   * @param promptId    Prompt being purchased
   * @param buyerWallet Buyer's Stellar public key
   * @param txHash      Confirmed transaction hash from Stellar Horizon
   */
  async recordPurchase(
    promptId: string,
    buyerWallet: string,
    txHash: string
  ): Promise<PurchaseResult> {
    const res = await fetch(`${this.apiUrl}/api/prompts/${promptId}/purchase`, {
      method: "POST",
      headers: this.baseHeaders(),
      body: JSON.stringify({ buyerWallet, txHash }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
      return { success: false, error: err.error ?? "Unknown error" };
    }
    return { success: true, txHash };
  }

  // ── Governance / voting ─────────────────────────────────────────────────────

  /**
   * Cast an upvote for a prompt.
   * Only wallets that have purchased the prompt may vote (enforced server-side).
   */
  async upvote(promptId: string, voterWallet: string): Promise<VoteResult> {
    const res = await fetch(`${this.apiUrl}/api/governance/vote/${promptId}`, {
      method: "POST",
      headers: this.baseHeaders(),
      body: JSON.stringify({ voterWallet }),
    });
    const data = await res.json() as { upvotes?: number; error?: string };
    if (!res.ok) throw new Error(data.error ?? `upvote failed: ${res.status}`);
    return { success: true, upvotes: data.upvotes ?? 0 };
  }

  /**
   * Fetch the top community-ranked prompts.
   */
  async getTopPrompts(limit = 10): Promise<Array<{ promptId: string; upvotes: number }>> {
    const res = await fetch(`${this.apiUrl}/api/governance/top?limit=${limit}`, {
      headers: this.baseHeaders(),
    });
    if (!res.ok) throw new Error(`getTopPrompts failed: ${res.status}`);
    const data = await res.json() as { prompts?: Array<{ promptId: string; upvotes: number }> };
    return data.prompts ?? [];
  }
}
