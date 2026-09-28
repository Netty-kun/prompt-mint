/**
 * Operator-approved unlock key recovery verification (Issue #114).
 *
 * Confirms that the runtime unlock key restored from backup/escrow can still
 * decrypt historical ciphertext. Does not bypass on-chain has_access checks
 * and never returns prompt plaintext.
 */

import { isValidAdminToken } from "../../src/lib/auth/adminToken";
import { withBodySizeLimit } from "../../src/lib/api/bodySizeLimit";
import {
  isKeyRecoveryScenario,
  recoveryScenarioAuditReason,
  verifyRecoveredKeyDecryptsFixture,
  type RecoveryCiphertextFixture,
} from "../../src/lib/unlock/keyRecovery";
import { recordAuditEvent } from "../../server/src/services/auditTrail";

function isFixture(value: unknown): value is RecoveryCiphertextFixture {
  if (!value || typeof value !== "object") return false;
  const f = value as Record<string, unknown>;
  return (
    typeof f.wrappedKey === "string" &&
    typeof f.encryptedPrompt === "string" &&
    typeof f.encryptionIv === "string" &&
    typeof f.expectedContentHash === "string"
  );
}

async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const clientIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress) as
    | string
    | undefined;

  if (!isValidAdminToken(req.headers.authorization, process.env.ADMIN_RECOVERY_TOKEN)) {
    void recordAuditEvent({
      action: "unlock_key_recovery_denied",
      result: "blocked",
      promptId: null,
      walletAddress: null,
      requestId: req.requestId ?? null,
      clientIp: clientIp ?? null,
      reason: "unauthorized",
    });
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { scenario, operatorReference, fixture } = req.body ?? {};

  if (!isKeyRecoveryScenario(scenario)) {
    res.status(400).json({
      error: "scenario must be compromise, permanent_loss, or rollback",
    });
    return;
  }

  if (typeof operatorReference !== "string" || operatorReference.trim().length < 3) {
    res.status(400).json({ error: "operatorReference is required (incident or change ticket)." });
    return;
  }

  if (!isFixture(fixture)) {
    res.status(400).json({
      error: "fixture requires wrappedKey, encryptedPrompt, encryptionIv, expectedContentHash",
    });
    return;
  }

  const unlockPublicKey = process.env.UNLOCK_PUBLIC_KEY;
  const unlockPrivateKey = process.env.UNLOCK_PRIVATE_KEY;

  if (!unlockPublicKey || !unlockPrivateKey) {
    res.status(500).json({ error: "Unlock key material is not configured" });
    return;
  }

  const verification = await verifyRecoveredKeyDecryptsFixture({
    unlockPublicKey,
    unlockPrivateKey,
    fixture,
  });

  const auditBase = {
    promptId: null,
    walletAddress: null,
    requestId: req.requestId ?? null,
    clientIp: clientIp ?? null,
  };

  if (verification.verified) {
    void recordAuditEvent({
      action: "unlock_key_recovery_verified",
      result: "success",
      ...auditBase,
      reason: recoveryScenarioAuditReason(scenario),
    });

    res.status(200).json({
      success: true,
      verified: true,
      scenario,
      operatorReference: operatorReference.trim(),
      contentHash: verification.contentHash,
      message:
        "Recovery verification passed. Buyer unlock still requires wallet proof and on-chain has_access.",
    });
    return;
  }

  void recordAuditEvent({
    action: "unlock_key_recovery_failed",
    result: "failure",
    ...auditBase,
    reason: verification.failureReason ?? "decrypt_failed",
  });

  res.status(422).json({
    success: false,
    verified: false,
    scenario,
    failureReason: verification.failureReason,
  });
}

export default withBodySizeLimit(handler, 32 * 1024);
