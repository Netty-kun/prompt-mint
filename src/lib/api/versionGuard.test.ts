// @vitest-environment node

import { describe, expect, it, vi } from "vitest";
import { negotiateVersion } from "./versionGuard";
import {
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
} from "./payloadVersion";
import { ErrorCode } from "./errorCodes";

// ── Test harness ──────────────────────────────────────────────────────────────

function makeReqRes(acceptVersion?: string) {
  const headers: Record<string, string> = {};
  if (acceptVersion !== undefined) {
    headers["accept-version"] = acceptVersion;
  }

  let statusCode = 0;
  let responseBody: unknown = null;
  const setHeaderSpy = vi.fn();

  const req = { headers };
  const res = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      responseBody = body;
      return this;
    },
    setHeader: setHeaderSpy,
  };

  return { req, res, getStatus: () => statusCode, getBody: () => responseBody, setHeaderSpy };
}

// ── Primary success paths ─────────────────────────────────────────────────────

describe("negotiateVersion — success paths", () => {
  it("returns CURRENT_API_VERSION when no Accept-Version header is sent", () => {
    const { req, res } = makeReqRes();
    const version = negotiateVersion(req, res);
    expect(version).toBe(CURRENT_API_VERSION);
  });

  it("returns CURRENT_API_VERSION when Accept-Version is 'latest'", () => {
    const { req, res } = makeReqRes("latest");
    const version = negotiateVersion(req, res);
    expect(version).toBe(CURRENT_API_VERSION);
  });

  it("sets X-API-Version response header to the resolved version", () => {
    const { req, res, setHeaderSpy } = makeReqRes();
    negotiateVersion(req, res);
    expect(setHeaderSpy).toHaveBeenCalledWith("X-API-Version", CURRENT_API_VERSION);
  });

  it("accepts every version in SUPPORTED_API_VERSIONS", () => {
    for (const v of SUPPORTED_API_VERSIONS) {
      const { req, res } = makeReqRes(v);
      const version = negotiateVersion(req, res);
      expect(version).toBe(v);
    }
  });

  it("echoes the pinned version back in X-API-Version", () => {
    const pinned = SUPPORTED_API_VERSIONS[SUPPORTED_API_VERSIONS.length - 1]; // oldest
    const { req, res, setHeaderSpy } = makeReqRes(pinned);
    negotiateVersion(req, res);
    expect(setHeaderSpy).toHaveBeenCalledWith("X-API-Version", pinned);
  });
});

// ── Failure paths ─────────────────────────────────────────────────────────────

describe("negotiateVersion — unsupported version", () => {
  it("returns null when the requested version is not supported", () => {
    const { req, res } = makeReqRes("1999-01-01");
    const version = negotiateVersion(req, res);
    expect(version).toBeNull();
  });

  it("responds with HTTP 400 for an unsupported version", () => {
    const { req, res, getStatus } = makeReqRes("1999-01-01");
    negotiateVersion(req, res);
    expect(getStatus()).toBe(400);
  });

  it("response body carries code UNSUPPORTED_VERSION", () => {
    const { req, res, getBody } = makeReqRes("2099-12-31");
    negotiateVersion(req, res);
    const body = getBody() as any;
    expect(body.code).toBe(ErrorCode.UNSUPPORTED_VERSION);
  });

  it("response body includes the unsupported version string in the error message", () => {
    const { req, res, getBody } = makeReqRes("v99");
    negotiateVersion(req, res);
    const body = getBody() as any;
    expect(body.error).toContain("v99");
  });

  it("error response itself contains apiVersion so callers can always parse the envelope", () => {
    const { req, res, getBody } = makeReqRes("1999-01-01");
    negotiateVersion(req, res);
    const body = getBody() as any;
    expect(body.apiVersion).toBe(CURRENT_API_VERSION);
  });

  it("still sets X-API-Version header even when rejecting", () => {
    const { req, res, setHeaderSpy } = makeReqRes("1999-01-01");
    negotiateVersion(req, res);
    expect(setHeaderSpy).toHaveBeenCalledWith("X-API-Version", CURRENT_API_VERSION);
  });

  it("rejects plain 'v1' string (wrong format)", () => {
    const { req, res } = makeReqRes("v1");
    expect(negotiateVersion(req, res)).toBeNull();
  });

  it("rejects 'v2025-01-01' (version with leading 'v')", () => {
    const { req, res } = makeReqRes("v2025-01-01");
    expect(negotiateVersion(req, res)).toBeNull();
  });
});

// ── Backward-compat default ───────────────────────────────────────────────────

describe("negotiateVersion — backward-compat baseline", () => {
  it("accepts the '2024-01-01' baseline so callers pinned before this feature still work", () => {
    const { req, res } = makeReqRes("2024-01-01");
    const version = negotiateVersion(req, res);
    expect(version).toBe("2024-01-01");
  });

  it("baseline version produces a valid non-null result (no 400 is sent)", () => {
    const { req, res, getStatus } = makeReqRes("2024-01-01");
    negotiateVersion(req, res);
    // status() is only called on error; if version is valid it stays at 0
    expect(getStatus()).toBe(0);
  });
});
