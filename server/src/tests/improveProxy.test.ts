import httpMocks from "node-mocks-http";
import { ImproveProxy } from "../controllers/controllers";
import { _resetCircuitBreakerRegistry } from "../services/circuitBreaker";

describe("ImproveProxy outbound request handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    _resetCircuitBreakerRegistry();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("forwards a bounded timeout signal to the upstream gateway", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ improved: "better prompt" }),
      text: async () => "",
    });
    global.fetch = fetchMock as any;

    const req = httpMocks.createRequest({ method: "POST", body: "improve this" });
    const res = httpMocks.createResponse();

    await ImproveProxy(req, res);

    expect(res.statusCode).toBe(200);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("returns 504 when the upstream request times out (AbortError)", async () => {
    global.fetch = jest.fn().mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), { name: "AbortError" }),
    ) as any;

    const req = httpMocks.createRequest({ method: "POST", body: "improve this" });
    const res = httpMocks.createResponse();

    await ImproveProxy(req, res);

    expect(res.statusCode).toBe(504);
    expect(res._getJSONData().message).toBe("Gateway Timeout");
  });

  it("opens the circuit breaker after repeated upstream failures and short-circuits further calls", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("upstream down")) as any;

    for (let i = 0; i < 5; i++) {
      const req = httpMocks.createRequest({ method: "POST", body: "x" });
      const res = httpMocks.createResponse();
      await ImproveProxy(req, res);
    }

    const fetchCallsAfterTrip = (global.fetch as jest.Mock).mock.calls.length;

    const req = httpMocks.createRequest({ method: "POST", body: "x" });
    const res = httpMocks.createResponse();
    await ImproveProxy(req, res);

    expect(res.statusCode).toBe(503);
    // The breaker should have rejected without calling fetch again.
    expect((global.fetch as jest.Mock).mock.calls.length).toBe(fetchCallsAfterTrip);
  });
});
