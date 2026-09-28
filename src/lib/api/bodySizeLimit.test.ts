import { describe, it, expect, vi } from "vitest";
import { withBodySizeLimit } from "./bodySizeLimit";

function makeRes() {
  const res: { statusCode: number; body: any; status: (code: number) => typeof res; json: (data: any) => typeof res } = {
    statusCode: 0,
    body: undefined,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe("withBodySizeLimit", () => {
  it("calls through to the handler when the body is within the limit", async () => {
    const handler = vi.fn(async (_req, res) => res.status(200).json({ ok: true }));
    const wrapped = withBodySizeLimit(handler, 1024);

    const res = makeRes();
    await wrapped({ headers: {}, body: { text: "small" } }, res);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("rejects with 413 when Content-Length declares a body over the limit", async () => {
    const handler = vi.fn(async (_req, res) => res.status(200).json({ ok: true }));
    const wrapped = withBodySizeLimit(handler, 100);

    const res = makeRes();
    await wrapped({ headers: { "content-length": "10000" }, body: {} }, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(413);
    expect(res.body.error).toContain("100-byte limit");
  });

  it("rejects with 413 when the parsed body exceeds the limit even without a matching Content-Length (decompression bomb case)", async () => {
    const handler = vi.fn(async (_req, res) => res.status(200).json({ ok: true }));
    const wrapped = withBodySizeLimit(handler, 100);

    const res = makeRes();
    // Content-Length understates the true (already-decompressed) body size.
    await wrapped({ headers: { "content-length": "20" }, body: { text: "x".repeat(1000) } }, res);

    expect(handler).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(413);
    expect(res.body.error).toContain("100-byte limit");
  });

  it("allows requests with no body at all", async () => {
    const handler = vi.fn(async (_req, res) => res.status(200).json({ ok: true }));
    const wrapped = withBodySizeLimit(handler, 100);

    const res = makeRes();
    await wrapped({ headers: {}, body: undefined }, res);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
  });
});
