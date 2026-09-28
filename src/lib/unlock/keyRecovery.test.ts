import { afterEach, describe, expect, it, vi } from "vitest";
import sodium from "libsodium-wrappers";
import {
  bytesToBase64,
  encryptPromptPlaintext,
  wrapPromptKey,
} from "../crypto/promptCrypto";
import {
  isKeyRecoveryScenario,
  recoveryScenarioAuditReason,
  verifyRecoveredKeyDecryptsFixture,
} from "./keyRecovery";

describe("keyRecovery", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("recognizes supported recovery scenarios", () => {
    expect(isKeyRecoveryScenario("compromise")).toBe(true);
    expect(isKeyRecoveryScenario("permanent_loss")).toBe(true);
    expect(isKeyRecoveryScenario("rollback")).toBe(true);
    expect(isKeyRecoveryScenario("other")).toBe(false);
  });

  it("maps scenarios to stable audit reason codes", () => {
    expect(recoveryScenarioAuditReason("compromise")).toBe("recovery_compromise");
    expect(recoveryScenarioAuditReason("rollback")).toBe("recovery_rollback");
  });

  it("recovery drill: restored key decrypts historical ciphertext without logging secrets", async () => {
    await sodium.ready;
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const keyPair = sodium.crypto_box_keypair();
    const publicKey = bytesToBase64(keyPair.publicKey);
    const privateKey = bytesToBase64(keyPair.privateKey);
    const plaintext = "Drill fixture — pre-rotation prompt body.";

    const encrypted = await encryptPromptPlaintext(plaintext);
    const wrappedKey = await wrapPromptKey(encrypted.keyBytes, publicKey);

    const result = await verifyRecoveredKeyDecryptsFixture({
      unlockPublicKey: publicKey,
      unlockPrivateKey: privateKey,
      fixture: {
        wrappedKey,
        encryptedPrompt: encrypted.encryptedPrompt,
        encryptionIv: encrypted.encryptionIv,
        expectedContentHash: encrypted.contentHash,
      },
    });

    expect(result.verified).toBe(true);
    expect(result.contentHash).toBe(encrypted.contentHash);

    const logged = [...logSpy.mock.calls, ...errorSpy.mock.calls]
      .flat()
      .map((arg) => String(arg))
      .join("\n");
    expect(logged).not.toContain(privateKey);
    expect(logged).not.toContain(plaintext);
  });

  it("recovery drill: wrong private key fails closed without decrypting", async () => {
    await sodium.ready;
    const primary = sodium.crypto_box_keypair();
    const other = sodium.crypto_box_keypair();
    const publicKey = bytesToBase64(primary.publicKey);

    const encrypted = await encryptPromptPlaintext("Legacy ciphertext sample.");
    const wrappedKey = await wrapPromptKey(encrypted.keyBytes, publicKey);

    const result = await verifyRecoveredKeyDecryptsFixture({
      unlockPublicKey: publicKey,
      unlockPrivateKey: bytesToBase64(other.privateKey),
      fixture: {
        wrappedKey,
        encryptedPrompt: encrypted.encryptedPrompt,
        encryptionIv: encrypted.encryptionIv,
        expectedContentHash: encrypted.contentHash,
      },
    });

    expect(result.verified).toBe(false);
    expect(result.failureReason).toBe("key_mismatch");
  });
});
