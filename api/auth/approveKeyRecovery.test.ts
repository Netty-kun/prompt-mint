// @vitest-environment node

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sodium from "libsodium-wrappers";
import {
  bytesToBase64,
  encryptPromptPlaintext,
  wrapPromptKey,
} from "../../src/lib/crypto/promptCrypto";

const recordAuditEventMock = vi.fn();

vi.mock("../../server/src/services/auditTrail", () => ({
  recordAuditEvent: (...args: unknown[]) => recordAuditEventMock(...args),
}));

import handler from "./approveKeyRecovery";

async function buildFixture() {
  await sodium.ready;
  const keyPair = sodium.crypto_box_keypair();
  const publicKey = bytesToBase64(keyPair.publicKey);
  const privateKey = bytesToBase64(keyPair.privateKey);
  const encrypted = await encryptPromptPlaintext("API recovery drill fixture.");
  const wrappedKey = await wrapPromptKey(encrypted.keyBytes, publicKey);

  return {
    publicKey,
    privateKey,
    fixture: {
      wrappedKey,
      encryptedPrompt: encrypted.encryptedPrompt,
      encryptionIv: encrypted.encryptionIv,
      expectedContentHash: encrypted.contentHash,
    },
  };
}

function mockReqRes(body: unknown, auth?: string) {
  const req = {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
    body,
    requestId: "req-recovery-1",
    socket: { remoteAddress: "127.0.0.1" },
  };
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return { req, res };
}

describe("approveKeyRecovery", () => {
  beforeEach(() => {
    recordAuditEventMock.mockClear();
    process.env.ADMIN_RECOVERY_TOKEN = "recovery-admin-token";
  });

  afterEach(() => {
    delete process.env.ADMIN_RECOVERY_TOKEN;
    delete process.env.UNLOCK_PUBLIC_KEY;
    delete process.env.UNLOCK_PRIVATE_KEY;
  });

  it("requires authenticated operator approval", async () => {
    const { req, res } = mockReqRes({ scenario: "compromise" });
    await handler(req, res);

    expect(res.statusCode).toBe(401);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "unlock_key_recovery_denied",
        result: "blocked",
        reason: "unauthorized",
      }),
    );
  });

  it("records audit event and verifies fixture without returning plaintext", async () => {
    const { publicKey, privateKey, fixture } = await buildFixture();
    process.env.UNLOCK_PUBLIC_KEY = publicKey;
    process.env.UNLOCK_PRIVATE_KEY = privateKey;

    const { req, res } = mockReqRes(
      {
        scenario: "rollback",
        operatorReference: "INC-2025-114",
        fixture,
      },
      "Bearer recovery-admin-token",
    );

    await handler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      verified: true,
      scenario: "rollback",
    });
    expect(res.body).not.toHaveProperty("plaintext");
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "unlock_key_recovery_verified",
        result: "success",
        reason: "recovery_rollback",
      }),
    );
  });

  it("fails verification when runtime key does not match historical ciphertext", async () => {
    const { publicKey, fixture } = await buildFixture();
    await sodium.ready;
    const wrong = sodium.crypto_box_keypair();
    process.env.UNLOCK_PUBLIC_KEY = publicKey;
    process.env.UNLOCK_PRIVATE_KEY = bytesToBase64(wrong.privateKey);

    const { req, res } = mockReqRes(
      {
        scenario: "permanent_loss",
        operatorReference: "CHG-77",
        fixture,
      },
      "Bearer recovery-admin-token",
    );

    await handler(req, res);

    expect(res.statusCode).toBe(422);
    expect(recordAuditEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "unlock_key_recovery_failed",
        result: "failure",
      }),
    );
  });
});
