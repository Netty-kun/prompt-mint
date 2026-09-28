import { describe, expect, it, beforeEach } from "vitest";
import {
  TakedownState,
  applyTakedown,
  reinstateListing,
  disputeTakedown,
  resolveDispute,
  rejectDispute,
  canPurchase,
  canUnlock,
  getTakedown,
  _clearTakedowns,
} from "@/lib/moderation/takedown";

describe("takedown dispute lifecycle", () => {
  beforeEach(() => {
    _clearTakedowns();
  });

  it("tracks dispute evidence and preserves the lifecycle state", () => {
    applyTakedown(7n, TakedownState.SALES_FROZEN, "Policy review");

    const dispute = disputeTakedown(7n, "Evidence attached");

    expect(dispute).not.toBeNull();
    expect(dispute?.disputeId).toMatch(/^dispute_/);
    expect(dispute?.reason).toContain("Evidence attached");
    expect(getTakedown(7n)?.state).toBe(TakedownState.SALES_FROZEN);
  });

  it("blocks new purchases and unlocks during emergency suspension", () => {
    applyTakedown(8n, TakedownState.EMERGENCY_SUSPENDED, "Legal hold", "admin");

    expect(canPurchase(8n, "buyer")).toBe(false);
    expect(canUnlock(8n, "buyer", true)).toBe(false);
  });

  it("restores the listing after reinstate and clears the dispute flag", () => {
    applyTakedown(9n, TakedownState.SALES_FROZEN, "Review");
    disputeTakedown(9n, "Counter evidence");

    const restored = reinstateListing(9n);

    expect(restored?.state).toBe(TakedownState.NONE);
    expect(getTakedown(9n)?.state).toBe(TakedownState.NONE);
    expect(canPurchase(9n, "buyer")).toBe(true);
  });

  it("resolves and rejects disputes without mutating on-chain access", () => {
    applyTakedown(10n, TakedownState.SALES_FROZEN, "Review");
    disputeTakedown(10n, "Evidence");

    const resolved = resolveDispute(10n, "Refund approved");
    expect(resolved?.disputeStatus).toBe("RESOLVED");
    expect(resolved?.disputeResolutionReason).toBe("Refund approved");

    const rejected = rejectDispute(10n, "Insufficient evidence");
    expect(rejected?.disputeStatus).toBe("REJECTED");
    expect(rejected?.disputeResolutionReason).toBe("Insufficient evidence");
    expect(canUnlock(10n, "buyer", true)).toBe(true);
  });
});
