import {
  ResolvedApiKey,
  evaluateApiKey,
  extractPresentedKey,
} from "../middleware/apiKeyAuth";
import { InMemoryRateLimiter, generateApiKey } from "../services/apiKeys";

function makeResolved(over: Partial<ResolvedApiKey> = {}): ResolvedApiKey {
  return {
    id: "key-1",
    ownerWallet: "gabc",
    hashedKey: "hash",
    scopes: ["read"],
    rateLimitTier: "free",
    revoked: false,
    ...over,
  };
}

describe("extractPresentedKey", () => {
  it("reads a Bearer token", () => {
    expect(
      extractPresentedKey({ headers: { authorization: "Bearer pm_a_b" } }),
    ).toBe("pm_a_b");
  });

  it("reads an X-Api-Key header", () => {
    expect(extractPresentedKey({ headers: { "x-api-key": "pm_a_b" } })).toBe(
      "pm_a_b",
    );
  });

  it("returns null when absent", () => {
    expect(extractPresentedKey({ headers: {} })).toBeNull();
  });
});

describe("evaluateApiKey", () => {
  const limiter = () => new InMemoryRateLimiter();

  it("401s on missing or malformed keys", async () => {
    const opts = { resolveByPrefix: async () => null };
    expect((await evaluateApiKey(null, "read", opts, limiter())).status).toBe(401);
    expect(
      (await evaluateApiKey("garbage", "read", opts, limiter())).status,
    ).toBe(401);
  });

  it("401s on unknown or revoked keys", async () => {
    const key = generateApiKey();
    expect(
      (
        await evaluateApiKey(
          key.plaintext,
          "read",
          { resolveByPrefix: async () => null },
          limiter(),
        )
      ).status,
    ).toBe(401);
    expect(
      (
        await evaluateApiKey(
          key.plaintext,
          "read",
          {
            resolveByPrefix: async () =>
              makeResolved({ hashedKey: key.hash, revoked: true }),
          },
          limiter(),
        )
      ).status,
    ).toBe(401);
  });

  it("401s when the hash does not match", async () => {
    const key = generateApiKey();
    const result = await evaluateApiKey(
      key.plaintext,
      "read",
      { resolveByPrefix: async () => makeResolved({ hashedKey: "wrong" }) },
      limiter(),
    );
    expect(result.status).toBe(401);
  });

  it("403s when the scope is insufficient", async () => {
    const key = generateApiKey();
    const result = await evaluateApiKey(
      key.plaintext,
      "write",
      {
        resolveByPrefix: async () =>
          makeResolved({ hashedKey: key.hash, scopes: ["read"] }),
      },
      limiter(),
    );
    expect(result.status).toBe(403);
  });

  it("200s and returns context on a valid key", async () => {
    const key = generateApiKey();
    const result = await evaluateApiKey(
      key.plaintext,
      "read",
      {
        resolveByPrefix: async () =>
          makeResolved({ hashedKey: key.hash, scopes: ["admin"] }),
      },
      limiter(),
    );
    expect(result.status).toBe(200);
    expect(result.context).toMatchObject({ id: "key-1", ownerWallet: "gabc" });
  });

  it("429s once the tier limit is exhausted", async () => {
    const key = generateApiKey();
    const shared = new InMemoryRateLimiter();
    const opts = {
      resolveByPrefix: async () =>
        makeResolved({ hashedKey: key.hash, rateLimitTier: "free" as const }),
    };
    // free tier = 60/min; exhaust it.
    for (let i = 0; i < 60; i += 1) {
      const r = await evaluateApiKey(key.plaintext, "read", opts, shared);
      expect(r.status).toBe(200);
    }
    const blocked = await evaluateApiKey(key.plaintext, "read", opts, shared);
    expect(blocked.status).toBe(429);
  });
});
