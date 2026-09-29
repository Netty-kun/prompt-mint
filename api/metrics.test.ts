import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/observability/wrapper", () => ({
  withObservability: (handler: unknown) => handler,
}));

import handler from "./metrics";
import { metrics } from "../src/lib/observability/metrics";

function createRes() {
  return {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    setHeader(name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    send(data: string) {
      this.body = data;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };
}

describe("GET /api/metrics", () => {
  beforeEach(() => {
    metrics._resetForTests();
  });

  it("exposes Prometheus text for scraped marketplace metrics", async () => {
    metrics.trackRpcCall("getHealth", 15, "ok");
    metrics.trackEndpointHealth("health", true, 15);

    const res = createRes();
    await handler({ method: "GET", headers: {}, url: "/api/metrics", socket: {} }, res);

    expect(res.statusCode).toBe(200);
    expect(res.headers["Content-Type"]).toContain("text/plain");
    expect(String(res.body)).toContain("rpc_call_duration_ms");
    expect(String(res.body)).toContain("api_endpoint_health");
  });

  it("rejects non-GET requests", async () => {
    const res = createRes();
    await handler({ method: "POST", headers: {}, url: "/api/metrics", socket: {} }, res);
    expect(res.statusCode).toBe(405);
  });
});
