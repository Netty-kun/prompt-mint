import {
  decryptPromptCiphertext,
  hashPromptPlaintext,
  normalizeContentHash,
  unwrapPromptKey,
} from "../crypto/promptCrypto";

/** Operational scenarios covered by the key recovery runbooks. */
export type KeyRecoveryScenario = "compromise" | "permanent_loss" | "rollback";

export const KEY_RECOVERY_SCENARIOS: readonly KeyRecoveryScenario[] = [
  "compromise",
  "permanent_loss",
  "rollback",
] as const;

export function isKeyRecoveryScenario(value: unknown): value is KeyRecoveryScenario {
  return (
    typeof value === "string" &&
    (KEY_RECOVERY_SCENARIOS as readonly string[]).includes(value)
  );
}

/**
 * Non-secret ciphertext captured before rotation or from a recovery canary listing.
 * Used in drills to prove a restored private key still unwraps historical payloads.
 */
export interface RecoveryCiphertextFixture {
  wrappedKey: string;
  encryptedPrompt: string;
  encryptionIv: string;
  expectedContentHash: string;
}

export type RecoveryVerificationFailureReason =
  | "key_mismatch"
  | "integrity_failure"
  | "decrypt_failed";

export interface RecoveryVerificationResult {
  verified: boolean;
  contentHash?: string;
  failureReason?: RecoveryVerificationFailureReason;
}

export interface VerifyRecoveredKeyParams {
  unlockPublicKey: string;
  unlockPrivateKey: string;
  fixture: RecoveryCiphertextFixture;
}

/**
 * Verifies that the configured unlock key pair can decrypt a historical fixture.
 * Never logs key material or plaintext; callers must not pass secrets to loggers.
 */
export async function verifyRecoveredKeyDecryptsFixture(
  params: VerifyRecoveredKeyParams,
): Promise<RecoveryVerificationResult> {
  const { unlockPublicKey, unlockPrivateKey, fixture } = params;

  let keyBytes: Uint8Array;
  try {
    keyBytes = await unwrapPromptKey(
      fixture.wrappedKey,
      unlockPublicKey,
      unlockPrivateKey,
    );
  } catch {
    return { verified: false, failureReason: "key_mismatch" };
  }

  let plaintext: string;
  try {
    plaintext = await decryptPromptCiphertext(
      fixture.encryptedPrompt,
      fixture.encryptionIv,
      keyBytes,
    );
  } catch {
    return { verified: false, failureReason: "decrypt_failed" };
  }

  const contentHash = await hashPromptPlaintext(plaintext);
  const expected = normalizeContentHash(fixture.expectedContentHash);
  if (contentHash !== expected) {
    return { verified: false, failureReason: "integrity_failure" };
  }

  return { verified: true, contentHash };
}

/** Stable audit reason prefix for an approved recovery scenario. */
export function recoveryScenarioAuditReason(scenario: KeyRecoveryScenario): string {
  return `recovery_${scenario}`;
}
