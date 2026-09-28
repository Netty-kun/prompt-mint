import express from "express";
import type { Server } from "http";
import { JSON_BODY_LIMIT, jsonBodyTooLargeHandler } from "../middleware/bodySizeLimit";

function buildTestApp() {
  const app = express();
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.post("/echo", (req, res) => {
    res.status(200).json({ received: true, size: JSON.stringify(req.body).length });
  });
  app.use(jsonBodyTooLargeHandler);
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

describe("JSON body size limit", () => {
  let server: Server;
  let url: string;

  beforeAll(async () => {
    ({ server, url } = await listen(buildTestApp()));
  });

  afterAll(() => {
    server.close();
  });

  it("accepts a payload under the limit", async () => {
    const res = await fetch(`${url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "a".repeat(1000) }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.received).toBe(true);
  });

  it("rejects a payload over the limit with a clean 413 JSON response", async () => {
    const oversized = "a".repeat(400 * 1024); // 400kb > 300kb limit
    const res = await fetch(`${url}/echo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: oversized }),
    });
    expect(res.status).toBe(413);
    const data = await res.json();
    expect(data.error).toContain(JSON_BODY_LIMIT);
  });
});
