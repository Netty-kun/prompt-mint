import { describe, it, expect, vi, afterEach } from "vitest";
import { checkHealth, getModels } from "./api";

describe("lib/api outbound request timeouts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("attaches an abort signal to outbound requests so a hung gateway can't block forever", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ models: [] }), { status: 200 }),
    );

    await getModels();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("falls back to the default model list if the request times out (AbortError)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), { name: "AbortError" }),
    );

    const result = await getModels();
    expect(result.models.length).toBeGreaterThan(0);
  });

  it("checkHealth attaches a timeout signal and returns false on failure without throwing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("timeout"));

    const healthy = await checkHealth();

    expect(healthy).toBe(false);
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});
