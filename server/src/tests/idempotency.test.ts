import express from "express";
import type { Server } from "http";
import { idempotency } from "../middleware/idempotency";

jest.mock("../services/cacheService");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cacheService = require("../services/cacheService");

// In-memory stand-in for Redis so the middleware's real locking/TTL logic
// runs against something, without needing an actual Redis instance.
function installFakeCache() {
  const store = new Map<string, string>();

  cacheService.cacheGet.mockImplementation(async (key: string) => store.get(key) ?? null);
  cacheService.cacheSet.mockImplementation(async (key: string, value: string) => {
    store.set(key, value);
  });
  cacheService.cacheSetNX.mockImplementation(async (key: string, value: string) => {
    if (store.has(key)) return false;
    store.set(key, value);
    return true;
  });
  cacheService.cacheDel.mockImplementation(async (...keys: string[]) => {
    keys.forEach((k) => store.delete(k));
  });

  return store;
}

function buildTestApp(handlerCalls: { count: number }) {
  const app = express();
  app.use(express.json());
  app.use(idempotency());

  app.post("/widgets", (req, res) => {
    handlerCalls.count += 1;
    res.status(201).json({ id: handlerCalls.count, name: req.body?.name });
  });

  app.get("/widgets", (_req, res) => {
    handlerCalls.count += 1;
    res.status(200).json({ handled: handlerCalls.count });
  });

  app.post("/widgets/fail", (_req, res) => {
    handlerCalls.count += 1;
    res.status(500).json({ error: "boom" });
  });

  return app;
}

function listen(app: express.Express): Promise<{ server: Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

describe("Idempotency-Key middleware", () => {
  let server: Server;
  let url: string;
  let handlerCalls: { count: number };

  beforeEach(async () => {
    jest.clearAllMocks();
    installFakeCache();
    handlerCalls = { count: 0 };
    ({ server, url } = await listen(buildTestApp(handlerCalls)));
  });

  afterEach(() => {
    server.close();
  });

  it("runs the handler normally when no Idempotency-Key header is sent", async () => {
    const res1 = await fetch(`${url}/widgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "a" }),
    });
    const res2 = await fetch(`${url}/widgets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "a" }),
    });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(handlerCalls.count).toBe(2);
    expect((await res1.json()).id).not.toBe((await res2.json()).id);
  });

  it("replays the cached response for a retry with the same key and payload", async () => {
    const headers = {
      "Content-Type": "application/json",
      "Idempotency-Key": "key-123",
    };
    const body = JSON.stringify({ name: "widget-a" });

    const res1 = await fetch(`${url}/widgets`, { method: "POST", headers, body });
    const data1 = await res1.json();

    const res2 = await fetch(`${url}/widgets`, { method: "POST", headers, body });
    const data2 = await res2.json();

    expect(handlerCalls.count).toBe(1);
    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);
    expect(data2).toEqual(data1);
  });

  it("rejects reuse of the same key with a different payload", async () => {
    const headers = {
      "Content-Type": "application/json",
      "Idempotency-Key": "key-456",
    };

    const res1 = await fetch(`${url}/widgets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "widget-a" }),
    });
    expect(res1.status).toBe(201);

    const res2 = await fetch(`${url}/widgets`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "widget-b" }),
    });

    expect(res2.status).toBe(409);
    expect(handlerCalls.count).toBe(1);
  });

  it("does not cache a 5xx response, so a retry re-runs the handler", async () => {
    const headers = {
      "Content-Type": "application/json",
      "Idempotency-Key": "key-789",
    };
    const body = JSON.stringify({});

    const res1 = await fetch(`${url}/widgets/fail`, { method: "POST", headers, body });
    const res2 = await fetch(`${url}/widgets/fail`, { method: "POST", headers, body });

    expect(res1.status).toBe(500);
    expect(res2.status).toBe(500);
    expect(handlerCalls.count).toBe(2);
  });

  it("ignores the Idempotency-Key header on read-only requests", async () => {
    const headers = { "Idempotency-Key": "key-get" };

    const res1 = await fetch(`${url}/widgets`, { method: "GET", headers });
    const res2 = await fetch(`${url}/widgets`, { method: "GET", headers });

    expect(handlerCalls.count).toBe(2);
    expect((await res1.json()).handled).not.toBe((await res2.json()).handled);
  });
});
