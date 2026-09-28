import { describe, it, expect, vi, beforeEach } from "vitest";

describe("getFriendbotUrl", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns the TESTNET friendbot URL for TESTNET network", async () => {
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "TESTNET",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    const result = getFriendbotUrl("GABC12345...");
    expect(result).toBe("https://friendbot.stellar.org/?addr=GABC12345...");
  });

  it("returns the FUTURENET friendbot URL for FUTURENET network", async () => {
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "FUTURENET",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    const result = getFriendbotUrl("GDEF67890...");
    expect(result).toBe(
      "https://friendbot-futurenet.stellar.org/?addr=GDEF67890...",
    );
  });

  it("returns the LOCAL proxy URL for LOCAL network", async () => {
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "LOCAL",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    const result = getFriendbotUrl("GHIJ11111...");
    expect(result).toBe("/friendbot?addr=GHIJ11111...");
  });

  it("throws an error for MAINNET (PUBLIC) network", async () => {
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "PUBLIC",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    expect(() =>
      getFriendbotUrl("GKLM22222..."),
    ).toThrowError(
      "Unknown or unsupported PUBLIC_STELLAR_NETWORK for friendbot: PUBLIC",
    );
  });

  it("throws an error for an unknown network value", async () => {
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "UNKNOWN_NETWORK",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    expect(() =>
      getFriendbotUrl("GNOP33333..."),
    ).toThrowError(
      "Unknown or unsupported PUBLIC_STELLAR_NETWORK for friendbot: UNKNOWN_NETWORK",
    );
  });

  it("handles the STANDALONE → LOCAL conversion correctly", async () => {
    // The env.ts converts STANDALONE to LOCAL
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "LOCAL",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    const result = getFriendbotUrl("GQRST44444...");
    expect(result).toBe("/friendbot?addr=GQRST44444...");
  });

  it("works with an empty address string", async () => {
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "TESTNET",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    const result = getFriendbotUrl("");
    expect(result).toBe("https://friendbot.stellar.org/?addr=");
  });

  it("correctly encodes special characters in the address", async () => {
    vi.doMock("../../lib/env", () => ({
      stellarNetwork: "TESTNET",
    }));
    const { getFriendbotUrl } = await import("../friendbot");
    const result = getFriendbotUrl("G@SPECIAL#ADDR$");
    // The URL template uses string interpolation, not URLSearchParams,
    // so special characters are passed through as-is
    expect(result).toBe(
      "https://friendbot.stellar.org/?addr=G@SPECIAL#ADDR$",
    );
  });
});
