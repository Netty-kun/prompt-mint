// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  CURRENT_API_VERSION,
  SUPPORTED_API_VERSIONS,
  WEBHOOK_SCHEMA_VERSION,
  resolveApiVersion,
  withVersion,
  UNSUPPORTED_VERSION_CODE,
} from "./payloadVersion";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("version constants", () => {
  it("CURRENT_API_VERSION is included in SUPPORTED_API_VERSIONS", () => {
    expect(SUPPORTED_API_VERSIONS).toContain(CURRENT_API_VERSION);
  });

  it("WEBHOOK_SCHEMA_VERSION is a non-empty date string", () => {
    expect(WEBHOOK_SCHEMA_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("SUPPORTED_API_VERSIONS contains at least the baseline and current version", () => {
    expect(SUPPORTED_API_VERSIONS).toContain("2024-01-01"); // baseline / backward-compat
    expect(SUPPORTED_API_VERSIONS).toContain("2025-01-01"); // current
  });

  it("UNSUPPORTED_VERSION_CODE is a stable string constant", () => {
    expect(UNSUPPORTED_VERSION_CODE).toBe("UNSUPPORTED_VERSION");
  });
});

// ── resolveApiVersion ─────────────────────────────────────────────────────────

describe("resolveApiVersion", () => {
  it("returns CURRENT_API_VERSION when no header is present", () => {
    expect(resolveApiVersion({})).toBe(CURRENT_API_VERSION);
  });

  it("returns CURRENT_API_VERSION when header is an empty string", () => {
    expect(resolveApiVersion({ "accept-version": "" })).toBe(CURRENT_API_VERSION);
  });

  it("returns CURRENT_API_VERSION when header is 'latest'", () => {
    expect(resolveApiVersion({ "accept-version": "latest" })).toBe(CURRENT_API_VERSION);
  });

  it("returns CURRENT_API_VERSION when header value is '  latest  ' (trimmed)", () => {
    expect(resolveApiVersion({ "accept-version": "  latest  " })).toBe(CURRENT_API_VERSION);
  });

  it("returns the version when the header names a supported version", () => {
    for (const v of SUPPORTED_API_VERSIONS) {
      expect(resolveApiVersion({ "accept-version": v })).toBe(v);
    }
  });

  it("returns null when the requested version is not supported", () => {
    expect(resolveApiVersion({ "accept-version": "1999-01-01" })).toBeNull();
    expect(resolveApiVersion({ "accept-version": "v1" })).toBeNull();
    expect(resolveApiVersion({ "accept-version": "2099-12-31" })).toBeNull();
  });

  it("picks the first element when the header is an array", () => {
    expect(resolveApiVersion({ "accept-version": [CURRENT_API_VERSION, "1999-01-01"] })).toBe(
      CURRENT_API_VERSION,
    );
  });

  it("returns null when the first array element is unsupported", () => {
    expect(resolveApiVersion({ "accept-version": ["1999-01-01", CURRENT_API_VERSION] })).toBeNull();
  });
});

// ── withVersion ───────────────────────────────────────────────────────────────

describe("withVersion", () => {
  it("adds apiVersion to the returned object", () => {
    const result = withVersion({ foo: "bar" }, CURRENT_API_VERSION);
    expect(result.apiVersion).toBe(CURRENT_API_VERSION);
    expect(result.foo).toBe("bar");
  });

  it("does not mutate the original object", () => {
    const original = { a: 1 };
    withVersion(original, CURRENT_API_VERSION);
    expect((original as any).apiVersion).toBeUndefined();
  });

  it("defaults to CURRENT_API_VERSION when no version is passed", () => {
    const result = withVersion({ x: 42 });
    expect(result.apiVersion).toBe(CURRENT_API_VERSION);
  });

  it("accepts the baseline version", () => {
    const result = withVersion({ x: 1 }, "2024-01-01");
    expect(result.apiVersion).toBe("2024-01-01");
  });

  it("apiVersion is the first key in the serialised JSON (envelope convention)", () => {
    const result = withVersion({ z: 1, a: 2 }, CURRENT_API_VERSION);
    const keys = Object.keys(result);
    expect(keys[0]).toBe("apiVersion");
  });
});
