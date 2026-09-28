import { Appeal } from "../models/Appeal";
import { ModerationDecision } from "../models/ModerationDecision";
import { AppError } from "../lib/AppError";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface EvidenceRef {
  label: string;
  redactedRef: string;
}

export interface FileAppealParams {
  decisionId: string;
  appellantAddress: string;
  statement: string;
  evidenceRefs?: EvidenceRef[];
}

export type AppealOutcome = "approved" | "rejected";

export interface ResolveAppealParams {
  appealId: string;
  resolverAddress: string;
  outcome: AppealOutcome;
  reason: string;
  evidenceRefs?: EvidenceRef[];
}

export interface WithdrawAppealParams {
  appealId: string;
  appellantAddress: string;
  reason?: string;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class AppealError extends AppError {
  constructor(
    message: string,
    public readonly code: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message, httpStatus, code);
    this.name = "AppealError";
  }
}

// ── File Appeal ───────────────────────────────────────────────────────────────

export async function fileAppeal(params: FileAppealParams) {
  const { decisionId, appellantAddress, statement, evidenceRefs = [] } = params;

  // 1. Validate the decision exists
  const decision = await ModerationDecision.findById(decisionId).lean();
  if (!decision) {
    throw new AppealError("Moderation decision not found.", "DECISION_NOT_FOUND", 404);
  }

  // 2. Check appealability
  if (!decision.isAppealable) {
    throw new AppealError(
      "This decision is not eligible for appeal.",
      "NOT_APPEALABLE",
      403,
    );
  }

  // 3. Check appeal window
  const now = new Date();
  if (now > new Date(decision.appealWindowClosesAt)) {
    throw new AppealError(
      "The appeal window for this decision has closed.",
      "WINDOW_CLOSED",
      403,
    );
  }

  // 4. Create appeal (duplicate key → caught below)
  const historyEntry = {
    fromStatus: null,
    toStatus: "open",
    actor: appellantAddress.toLowerCase(),
    timestamp: now,
    reason: statement,
    evidenceRefs,
  };

  try {
    const appeal = await Appeal.create({
      decisionId,
      appellantAddress: appellantAddress.toLowerCase(),
      status: "open",
      statement,
      evidenceRefs,
      history: [historyEntry],
    });

    return appeal.toObject();
  } catch (err: unknown) {
    if ((err as { code?: number }).code === 11000) {
      throw new AppealError(
        "You have already filed an appeal for this decision.",
        "DUPLICATE_APPEAL",
        409,
      );
    }
    throw err;
  }
}

// ── Resolve Appeal ────────────────────────────────────────────────────────────

export async function resolveAppeal(params: ResolveAppealParams) {
  const { appealId, resolverAddress, outcome, reason, evidenceRefs = [] } = params;

  // 1. Fetch appeal
  const appeal = await Appeal.findById(appealId);
  if (!appeal) {
    throw new AppealError("Appeal not found.", "APPEAL_NOT_FOUND", 404);
  }

  // 2. Only open / under_review appeals can be resolved
  if (!["open", "under_review"].includes(appeal.status)) {
    throw new AppealError(
      `Cannot resolve an appeal that is already "${appeal.status}".`,
      "INVALID_STATUS",
      409,
    );
  }

  // 3. Reviewer separation — original moderator cannot be the sole resolver
  const decision = await ModerationDecision.findById(appeal.decisionId).lean();
  if (!decision) {
    throw new AppealError(
      "Linked moderation decision not found.",
      "DECISION_NOT_FOUND",
      404,
    );
  }

  if (resolverAddress.toLowerCase() === decision.moderatorAddress) {
    throw new AppealError(
      "The original moderator cannot be the sole appeal resolver.",
      "REVIEWER_SEPARATION",
      403,
    );
  }

  // 4. Transition
  const now = new Date();
  appeal.history.push({
    fromStatus: appeal.status,
    toStatus: outcome,
    actor: resolverAddress.toLowerCase(),
    timestamp: now,
    reason,
    evidenceRefs,
  });

  appeal.status = outcome;
  appeal.resolverAddress = resolverAddress.toLowerCase();
  appeal.resolutionReason = reason;

  await appeal.save();

  return appeal.toObject();
}

// ── Withdraw Appeal ───────────────────────────────────────────────────────────

export async function withdrawAppeal(params: WithdrawAppealParams) {
  const { appealId, appellantAddress, reason = "Withdrawn by appellant" } = params;

  const appeal = await Appeal.findById(appealId);
  if (!appeal) {
    throw new AppealError("Appeal not found.", "APPEAL_NOT_FOUND", 404);
  }

  // Only the original appellant can withdraw
  if (appeal.appellantAddress !== appellantAddress.toLowerCase()) {
    throw new AppealError(
      "Only the original appellant may withdraw this appeal.",
      "NOT_APPELLANT",
      403,
    );
  }

  // Only open / under_review appeals can be withdrawn
  if (!["open", "under_review"].includes(appeal.status)) {
    throw new AppealError(
      `Cannot withdraw an appeal that is already "${appeal.status}".`,
      "INVALID_STATUS",
      409,
    );
  }

  const now = new Date();
  appeal.history.push({
    fromStatus: appeal.status,
    toStatus: "withdrawn",
    actor: appellantAddress.toLowerCase(),
    timestamp: now,
    reason,
    evidenceRefs: [],
  });

  appeal.status = "withdrawn";
  await appeal.save();

  return appeal.toObject();
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function getAppeal(appealId: string) {
  const appeal = await Appeal.findById(appealId)
    .populate("decisionId")
    .lean();

  if (!appeal) {
    throw new AppealError("Appeal not found.", "APPEAL_NOT_FOUND", 404);
  }

  return appeal;
}

export async function getAppealsForDecision(decisionId: string) {
  return Appeal.find({ decisionId })
    .sort({ createdAt: -1 })
    .lean();
}
