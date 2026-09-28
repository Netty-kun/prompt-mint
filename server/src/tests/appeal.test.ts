/**
 * Tests for the moderation appeal system.
 *
 * Uses jest mocking so no live MongoDB connection is required.
 * Mirrors the pattern established in auditTrail.test.ts.
 */

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockAppealCreate = jest.fn();
const mockAppealFindById = jest.fn();
const mockAppealFind = jest.fn();

jest.mock("../models/Appeal", () => {
  const mockChain = {
    sort: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue([]),
  };

  return {
    Appeal: {
      create: mockAppealCreate,
      findById: mockAppealFindById,
      find: (...args: unknown[]) => {
        mockAppealFind(...args);
        return mockChain;
      },
      __chain: mockChain,
    },
  };
});

const mockDecisionFindById = jest.fn();

jest.mock("../models/ModerationDecision", () => ({
  ModerationDecision: {
    findById: mockDecisionFindById,
  },
}));

import {
  fileAppeal,
  resolveAppeal,
  withdrawAppeal,
  AppealError,
} from "../services/appealService";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeFakeDecision(overrides: Record<string, unknown> = {}) {
  return {
    _id: "decision-1",
    moderatorAddress: "mod-wallet-1",
    isAppealable: true,
    appealWindowClosesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // +7 days
    ...overrides,
  };
}

function makeFakeAppeal(overrides: Record<string, unknown> = {}) {
  const history: unknown[] = [];
  return {
    _id: "appeal-1",
    decisionId: "decision-1",
    appellantAddress: "appellant-wallet",
    status: "open",
    statement: "I disagree with this decision",
    evidenceRefs: [],
    resolverAddress: null,
    resolutionReason: null,
    history,
    save: jest.fn().mockResolvedValue(undefined),
    toObject: jest.fn().mockReturnThis(),
    ...overrides,
  };
}

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// fileAppeal
// ===========================================================================

describe("fileAppeal", () => {
  it("creates an appeal with valid decision, statement, and evidence", async () => {
    const decision = makeFakeDecision();
    // findById().lean() chain
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    const fakeCreated = makeFakeAppeal();
    mockAppealCreate.mockResolvedValueOnce(fakeCreated);

    const result = await fileAppeal({
      decisionId: "decision-1",
      appellantAddress: "APPELLANT-WALLET",
      statement: "I disagree with this decision",
      evidenceRefs: [{ label: "screenshot", redactedRef: "ref:abc123" }],
    });

    expect(mockAppealCreate).toHaveBeenCalledTimes(1);
    const createArg = mockAppealCreate.mock.calls[0][0];

    // Wallet lowercased
    expect(createArg.appellantAddress).toBe("appellant-wallet");
    expect(createArg.status).toBe("open");
    expect(createArg.statement).toBe("I disagree with this decision");
    expect(createArg.evidenceRefs).toEqual([
      { label: "screenshot", redactedRef: "ref:abc123" },
    ]);

    // History entry recorded
    expect(createArg.history).toHaveLength(1);
    expect(createArg.history[0]).toEqual(
      expect.objectContaining({
        fromStatus: null,
        toStatus: "open",
        actor: "appellant-wallet",
        reason: "I disagree with this decision",
      }),
    );
    expect(createArg.history[0].timestamp).toBeInstanceOf(Date);

    expect(result).toBeDefined();
  });

  it("rejects when the decision does not exist", async () => {
    mockDecisionFindById.mockReturnValueOnce({ lean: () => null });

    const promise = fileAppeal({
      decisionId: "missing-id",
      appellantAddress: "wallet",
      statement: "test",
    });

    await expect(promise).rejects.toThrow(AppealError);
    // Verify the error code via a second setup
    mockDecisionFindById.mockReturnValueOnce({ lean: () => null });

    await expect(
      fileAppeal({
        decisionId: "missing-id",
        appellantAddress: "wallet",
        statement: "test",
      }),
    ).rejects.toMatchObject({ code: "DECISION_NOT_FOUND" });
  });

  it("rejects when the decision is not appealable", async () => {
    const decision = makeFakeDecision({ isAppealable: false });
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    await expect(
      fileAppeal({
        decisionId: "decision-1",
        appellantAddress: "wallet",
        statement: "test",
      }),
    ).rejects.toMatchObject({ code: "NOT_APPEALABLE" });
  });

  it("rejects a late appeal (window closed)", async () => {
    const decision = makeFakeDecision({
      appealWindowClosesAt: new Date(Date.now() - 1000), // already expired
    });
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    await expect(
      fileAppeal({
        decisionId: "decision-1",
        appellantAddress: "wallet",
        statement: "test",
      }),
    ).rejects.toMatchObject({ code: "WINDOW_CLOSED" });
  });

  it("rejects a duplicate appeal from the same appellant", async () => {
    const decision = makeFakeDecision();
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    // Simulate MongoDB duplicate-key error
    const dupErr = new Error("E11000 duplicate key") as Error & { code: number };
    dupErr.code = 11000;
    mockAppealCreate.mockRejectedValueOnce(dupErr);

    await expect(
      fileAppeal({
        decisionId: "decision-1",
        appellantAddress: "wallet",
        statement: "test",
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_APPEAL" });
  });
});

// ===========================================================================
// resolveAppeal
// ===========================================================================

describe("resolveAppeal", () => {
  it("approves an open appeal and records full history", async () => {
    const appeal = makeFakeAppeal({ status: "open" });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    const decision = makeFakeDecision({ moderatorAddress: "mod-wallet-1" });
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    const result = await resolveAppeal({
      appealId: "appeal-1",
      resolverAddress: "DIFFERENT-REVIEWER",
      outcome: "approved",
      reason: "Evidence supports the appellant",
      evidenceRefs: [{ label: "review-doc", redactedRef: "ref:xyz789" }],
    });

    expect(appeal.save).toHaveBeenCalledTimes(1);
    expect(appeal.status).toBe("approved");
    expect(appeal.resolverAddress).toBe("different-reviewer");
    expect(appeal.resolutionReason).toBe("Evidence supports the appellant");

    // History entry
    const lastEntry = appeal.history[appeal.history.length - 1];
    expect(lastEntry).toEqual(
      expect.objectContaining({
        fromStatus: "open",
        toStatus: "approved",
        actor: "different-reviewer",
        reason: "Evidence supports the appellant",
      }),
    );
    expect(lastEntry.evidenceRefs).toEqual([
      { label: "review-doc", redactedRef: "ref:xyz789" },
    ]);
    expect(lastEntry.timestamp).toBeInstanceOf(Date);

    expect(result).toBeDefined();
  });

  it("rejects an open appeal successfully", async () => {
    const appeal = makeFakeAppeal({ status: "under_review" });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    const decision = makeFakeDecision({ moderatorAddress: "mod-wallet-1" });
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    await resolveAppeal({
      appealId: "appeal-1",
      resolverAddress: "reviewer-2",
      outcome: "rejected",
      reason: "Insufficient evidence",
    });

    expect(appeal.status).toBe("rejected");
    expect(appeal.resolverAddress).toBe("reviewer-2");

    const lastEntry = appeal.history[appeal.history.length - 1];
    expect(lastEntry.toStatus).toBe("rejected");
  });

  it("blocks the original moderator from resolving (reviewer separation)", async () => {
    const appeal = makeFakeAppeal({ status: "open" });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    const decision = makeFakeDecision({ moderatorAddress: "mod-wallet-1" });
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    await expect(
      resolveAppeal({
        appealId: "appeal-1",
        resolverAddress: "MOD-WALLET-1", // same moderator, different case
        outcome: "approved",
        reason: "Self-approve attempt",
      }),
    ).rejects.toMatchObject({ code: "REVIEWER_SEPARATION" });
  });

  it("cannot resolve an already-resolved appeal", async () => {
    const appeal = makeFakeAppeal({ status: "approved" });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    await expect(
      resolveAppeal({
        appealId: "appeal-1",
        resolverAddress: "reviewer-2",
        outcome: "rejected",
        reason: "Trying to override",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("cannot resolve a withdrawn appeal", async () => {
    const appeal = makeFakeAppeal({ status: "withdrawn" });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    await expect(
      resolveAppeal({
        appealId: "appeal-1",
        resolverAddress: "reviewer-2",
        outcome: "rejected",
        reason: "Trying to resolve withdrawn",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("returns 404 for a non-existent appeal", async () => {
    mockAppealFindById.mockResolvedValueOnce(null);

    await expect(
      resolveAppeal({
        appealId: "no-such-id",
        resolverAddress: "reviewer",
        outcome: "approved",
        reason: "test",
      }),
    ).rejects.toMatchObject({ code: "APPEAL_NOT_FOUND", httpStatus: 404 });
  });
});

// ===========================================================================
// withdrawAppeal
// ===========================================================================

describe("withdrawAppeal", () => {
  it("allows the original appellant to withdraw an open appeal", async () => {
    const appeal = makeFakeAppeal({
      status: "open",
      appellantAddress: "appellant-wallet",
    });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    const result = await withdrawAppeal({
      appealId: "appeal-1",
      appellantAddress: "APPELLANT-WALLET", // case-insensitive match
    });

    expect(appeal.save).toHaveBeenCalledTimes(1);
    expect(appeal.status).toBe("withdrawn");

    const lastEntry = appeal.history[appeal.history.length - 1];
    expect(lastEntry).toEqual(
      expect.objectContaining({
        fromStatus: "open",
        toStatus: "withdrawn",
        actor: "appellant-wallet",
      }),
    );
    expect(lastEntry.timestamp).toBeInstanceOf(Date);

    expect(result).toBeDefined();
  });

  it("allows withdrawal from under_review status", async () => {
    const appeal = makeFakeAppeal({
      status: "under_review",
      appellantAddress: "appellant-wallet",
    });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    await withdrawAppeal({
      appealId: "appeal-1",
      appellantAddress: "appellant-wallet",
    });

    expect(appeal.status).toBe("withdrawn");
  });

  it("rejects withdrawal by someone who is not the appellant", async () => {
    const appeal = makeFakeAppeal({
      status: "open",
      appellantAddress: "appellant-wallet",
    });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    await expect(
      withdrawAppeal({
        appealId: "appeal-1",
        appellantAddress: "impostor-wallet",
      }),
    ).rejects.toMatchObject({ code: "NOT_APPELLANT" });
  });

  it("cannot withdraw an already-approved appeal", async () => {
    const appeal = makeFakeAppeal({
      status: "approved",
      appellantAddress: "appellant-wallet",
    });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    await expect(
      withdrawAppeal({
        appealId: "appeal-1",
        appellantAddress: "appellant-wallet",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("cannot withdraw an already-rejected appeal", async () => {
    const appeal = makeFakeAppeal({
      status: "rejected",
      appellantAddress: "appellant-wallet",
    });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    await expect(
      withdrawAppeal({
        appealId: "appeal-1",
        appellantAddress: "appellant-wallet",
      }),
    ).rejects.toMatchObject({ code: "INVALID_STATUS" });
  });

  it("returns 404 for a non-existent appeal", async () => {
    mockAppealFindById.mockResolvedValueOnce(null);

    await expect(
      withdrawAppeal({
        appealId: "no-such-id",
        appellantAddress: "wallet",
      }),
    ).rejects.toMatchObject({ code: "APPEAL_NOT_FOUND", httpStatus: 404 });
  });
});

// ===========================================================================
// History invariants
// ===========================================================================

describe("state-transition history", () => {
  it("each transition records actor, timestamp, reason, and evidenceRefs", async () => {
    // File the appeal
    const decision = makeFakeDecision();
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    const fakeCreated = makeFakeAppeal();
    mockAppealCreate.mockResolvedValueOnce(fakeCreated);

    await fileAppeal({
      decisionId: "decision-1",
      appellantAddress: "wallet-a",
      statement: "My argument",
      evidenceRefs: [{ label: "doc1", redactedRef: "ref:111" }],
    });

    const historyArg = mockAppealCreate.mock.calls[0][0].history[0];

    // Every required field is present
    expect(historyArg).toHaveProperty("actor");
    expect(historyArg).toHaveProperty("timestamp");
    expect(historyArg).toHaveProperty("reason");
    expect(historyArg).toHaveProperty("evidenceRefs");
    expect(historyArg).toHaveProperty("fromStatus");
    expect(historyArg).toHaveProperty("toStatus");
  });

  it("resolution transition also records all required fields", async () => {
    const appeal = makeFakeAppeal({ status: "open" });
    mockAppealFindById.mockResolvedValueOnce(appeal);

    const decision = makeFakeDecision({ moderatorAddress: "mod-1" });
    mockDecisionFindById.mockReturnValueOnce({ lean: () => decision });

    await resolveAppeal({
      appealId: "appeal-1",
      resolverAddress: "resolver-2",
      outcome: "rejected",
      reason: "Not convincing",
      evidenceRefs: [{ label: "counter-evidence", redactedRef: "ref:999" }],
    });

    const entry = appeal.history[appeal.history.length - 1];
    expect(entry.actor).toBe("resolver-2");
    expect(entry.timestamp).toBeInstanceOf(Date);
    expect(entry.reason).toBe("Not convincing");
    expect(entry.evidenceRefs).toEqual([
      { label: "counter-evidence", redactedRef: "ref:999" },
    ]);
    expect(entry.fromStatus).toBe("open");
    expect(entry.toStatus).toBe("rejected");
  });
});
