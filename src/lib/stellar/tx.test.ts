import { describe, it, expect, vi } from "vitest";

const ServerMock = vi.fn();

vi.mock("@stellar/stellar-sdk/rpc", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk/rpc")>();
  return {
    ...actual,
    Server: ServerMock,
  };
});

describe("getRpcServer", () => {
  it("configures a bounded request timeout so a hung RPC call can't block forever", async () => {
    const { getRpcServer } = await import("./tx");

    getRpcServer({ rpcUrl: "https://rpc.example.com", networkPassphrase: "Test" });

    expect(ServerMock).toHaveBeenCalledWith(
      "https://rpc.example.com",
      expect.objectContaining({ timeout: expect.any(Number) }),
    );
    const [, opts] = ServerMock.mock.calls[0];
    expect(opts.timeout).toBeGreaterThan(0);
  });

  it("honors an explicit timeoutMs override", async () => {
    const { getRpcServer } = await import("./tx");

    getRpcServer({ rpcUrl: "https://rpc.example.com", networkPassphrase: "Test", timeoutMs: 5_000 });

    const lastCall = ServerMock.mock.calls.at(-1)!;
    expect(lastCall[1]).toMatchObject({ timeout: 5_000 });
  });
});
