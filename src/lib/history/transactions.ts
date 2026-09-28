/**
 * Transaction history storage (#278).
 *
 * Persists a local, wallet-scoped ledger of the user's marketplace
 * transactions (purchases, sales, transfers) so a dedicated history page
 * can list, filter and link them to the Stellar explorer.
 *
 * Storage is local-only and isolated per wallet address, mirroring the
 * conventions already used by the recently-viewed history module.
 */

export type TransactionType = "purchase" | "sale" | "transfer";
export type TransactionStatus = "success" | "pending" | "failed";

export interface TransactionRecord {
  /** Stable unique id (Stellar tx hash when known, else a synthetic id). */
  id: string;
  /** On-chain transaction hash, used to build explorer links. */
  txHash?: string;
  type: TransactionType;
  status: TransactionStatus;
  /** Unix timestamp in milliseconds. */
  timestamp: number;
  /** Related prompt id, when applicable. */
  promptId?: string;
  /** Human-readable title/label for display. */
  title?: string;
  /** Amount in stroops (string to preserve precision). */
  amountStroops?: string;
  /** Counterparty address (seller for purchase, buyer for sale/transfer). */
  counterparty?: string;
}

const STORAGE_KEY_PREFIX = "prompt-mint:tx-history:v1";
const MAX_ENTRIES = 500;

function getStorageKey(walletAddress: string): string {
  return `${STORAGE_KEY_PREFIX}:${walletAddress.toLowerCase()}`;
}

export function isStorageAvailable(): boolean {
  try {
    const k = "__pm_tx_test__";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

function safeRead(walletAddress: string): TransactionRecord[] {
  try {
    const raw = localStorage.getItem(getStorageKey(walletAddress));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as TransactionRecord[];
  } catch {
    return [];
  }
}

function safeWrite(walletAddress: string, records: TransactionRecord[]): boolean {
  try {
    localStorage.setItem(
      getStorageKey(walletAddress),
      JSON.stringify(records.slice(0, MAX_ENTRIES))
    );
    return true;
  } catch {
    return false;
  }
}

/** Returns all transactions for a wallet, newest first. */
export function getTransactions(walletAddress: string): TransactionRecord[] {
  return safeRead(walletAddress).sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Records (or upserts by id) a transaction for a wallet.
 * Upsert lets a "pending" record be updated to "success"/"failed" later
 * without creating duplicates.
 */
export function recordTransaction(
  walletAddress: string,
  record: TransactionRecord
): boolean {
  if (!walletAddress) return false;
  const existing = safeRead(walletAddress);
  const idx = existing.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...record };
  } else {
    existing.unshift(record);
  }
  return safeWrite(walletAddress, existing);
}

/** Removes a single transaction by id. */
export function removeTransaction(walletAddress: string, id: string): boolean {
  const existing = safeRead(walletAddress);
  const next = existing.filter((r) => r.id !== id);
  return safeWrite(walletAddress, next);
}

/** Clears all transaction history for a wallet. */
export function clearTransactions(walletAddress: string): boolean {
  try {
    localStorage.removeItem(getStorageKey(walletAddress));
    return true;
  } catch {
    return false;
  }
}

export interface TransactionFilter {
  type?: TransactionType | "all";
  status?: TransactionStatus | "all";
  /** Inclusive lower bound (ms). */
  fromTimestamp?: number;
  /** Inclusive upper bound (ms). */
  toTimestamp?: number;
}

/** Applies type/status/date-range filtering to a list of records. */
export function filterTransactions(
  records: TransactionRecord[],
  filter: TransactionFilter
): TransactionRecord[] {
  return records.filter((r) => {
    if (filter.type && filter.type !== "all" && r.type !== filter.type) {
      return false;
    }
    if (filter.status && filter.status !== "all" && r.status !== filter.status) {
      return false;
    }
    if (filter.fromTimestamp != null && r.timestamp < filter.fromTimestamp) {
      return false;
    }
    if (filter.toTimestamp != null && r.timestamp > filter.toTimestamp) {
      return false;
    }
    return true;
  });
}
