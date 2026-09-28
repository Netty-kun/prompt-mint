import { AuditLog, AuditAction, AuditResult } from "../models/AuditLog";
import { createHash } from "crypto";

export interface AuditEventParams {
  action: AuditAction;
  result: AuditResult;
  promptId?: string | null;
  walletAddress?: string | null;
  requestId?: string | null;
  clientIp?: string | null;
  reason?: string | null;
  /** Non-sensitive context such as a route, resource id, or transaction amount. */
  metadata?: Record<string, string | number | boolean | null> | null;
}

let lastSequence = 0;
let lastHash: string | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Persist a structured audit event. Sensitive values (plaintext, keys,
 * signatures, challenge secrets) must NEVER be passed here.
 *
 * Fire-and-forget: errors are logged to stderr but never propagate to callers
 * so a DB hiccup cannot block a legitimate unlock.
 */
export async function recordAuditEvent(params: AuditEventParams): Promise<void> {
  const write = async () => {
    // Recover the chain head after a process restart. Writes are serialized in
    // this process so concurrent requests cannot produce a forked chain.
    if (lastSequence === 0 && typeof (AuditLog as any).findOne === "function") {
      const head = await (AuditLog as any).findOne({}).sort({ sequence: -1 }).lean();
      lastSequence = head?.sequence ?? 0;
      lastHash = head?.hash ?? null;
    }

    const occurredAt = new Date();
    const entry = {
      action: params.action,
      result: params.result,
      promptId: params.promptId ?? null,
      walletAddress: params.walletAddress ? params.walletAddress.toLowerCase() : null,
      requestId: params.requestId ?? null,
      clientIp: params.clientIp ?? null,
      reason: params.reason ?? null,
      metadata: params.metadata ?? null,
      sequence: lastSequence + 1,
      previousHash: lastHash,
      occurredAt,
    };
    const hash = createHash("sha256").update(canonicalJson({
      ...entry,
      occurredAt: occurredAt.toISOString(),
    })).digest("hex");
    await AuditLog.create({ ...entry, hash });
    lastSequence = entry.sequence;
    lastHash = hash;
  };

  // Preserve a successful chain after a failed write; callers never need to
  // wait on prior fire-and-forget audit work.
  writeQueue = writeQueue.then(write, write);
  try {
    await writeQueue;
  } catch (err) {
    // Do not let audit failures surface to callers.
    console.error("[audit] Failed to write audit event", { action: params.action, err });
  }
}

export function recordAdminAction(action: string, requestId?: string | null, clientIp?: string | null): Promise<void> {
  return recordAuditEvent({ action: "admin_action", result: "success", reason: action, requestId, clientIp, metadata: { action } });
}

export function recordLargeTransaction(params: { promptId?: string | null; walletAddress?: string | null; amountStroops: number; txHash?: string | null }): Promise<void> {
  return recordAuditEvent({
    action: "large_transaction",
    result: "success",
    promptId: params.promptId,
    walletAddress: params.walletAddress,
    reason: "threshold_exceeded",
    metadata: { amountStroops: params.amountStroops, txHash: params.txHash ?? null },
  });
}

/** Verify sequence numbers and hashes before relying on audit records in an investigation. */
export async function verifyAuditChain(): Promise<{ valid: boolean; invalidSequence?: number }> {
  const records = await AuditLog.find({}).sort({ sequence: 1 }).lean();
  let expectedSequence = 1;
  let previousHash: string | null = null;
  for (const record of records as any[]) {
    const entry = {
      action: record.action, result: record.result, promptId: record.promptId,
      walletAddress: record.walletAddress, requestId: record.requestId,
      clientIp: record.clientIp, reason: record.reason, metadata: record.metadata,
      sequence: record.sequence, previousHash: record.previousHash ?? null,
      occurredAt: new Date(record.occurredAt).toISOString(),
    };
    const hash = createHash("sha256").update(canonicalJson(entry)).digest("hex");
    if (record.sequence !== expectedSequence || record.previousHash !== previousHash || record.hash !== hash) {
      return { valid: false, invalidSequence: record.sequence };
    }
    expectedSequence += 1;
    previousHash = record.hash;
  }
  return { valid: true };
}

/**
 * Query audit events for incident review. Returns the most recent `limit`
 * events matching the filter, oldest-first within the result set.
 */
export async function queryAuditEvents(filter: {
  walletAddress?: string;
  promptId?: string;
  action?: AuditAction;
  result?: AuditResult;
  since?: Date;
  until?: Date;
  limit?: number;
}) {
  const query: Record<string, unknown> = {};

  if (filter.walletAddress) query.walletAddress = filter.walletAddress.toLowerCase();
  if (filter.promptId) query.promptId = filter.promptId;
  if (filter.action) query.action = filter.action;
  if (filter.result) query.result = filter.result;
  if (filter.since || filter.until) {
    query.createdAt = {} as Record<string, Date>;
    if (filter.since) (query.createdAt as Record<string, Date>)["$gte"] = filter.since;
    if (filter.until) (query.createdAt as Record<string, Date>)["$lte"] = filter.until;
  }

  return AuditLog.find(query)
    .sort({ createdAt: -1 })
    .limit(filter.limit ?? 100)
    .lean();
}
