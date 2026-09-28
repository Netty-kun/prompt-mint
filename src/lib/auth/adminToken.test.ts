import { describe, it, expect } from "vitest";
import { isValidAdminToken } from "./adminToken";

describe("isValidAdminToken", () => {
  it("accepts a correctly formatted bearer token that matches the expected secret", () => {
    expect(isValidAdminToken("Bearer super-secret", "super-secret")).toBe(true);
  });

  it("rejects when no admin token is configured, even if a header is present", () => {
    expect(isValidAdminToken("Bearer anything", undefined)).toBe(false);
    expect(isValidAdminToken("Bearer anything", "")).toBe(false);
  });

  it("rejects when the header is missing", () => {
    expect(isValidAdminToken(undefined, "super-secret")).toBe(false);
    expect(isValidAdminToken(null, "super-secret")).toBe(false);
  });

  it("rejects a header without the Bearer prefix", () => {
    expect(isValidAdminToken("super-secret", "super-secret")).toBe(false);
  });

  it("rejects a mismatched token", () => {
    expect(isValidAdminToken("Bearer wrong-secret", "super-secret")).toBe(false);
  });

  it("rejects a token that only partially matches", () => {
    expect(isValidAdminToken("Bearer super-secre", "super-secret")).toBe(false);
    expect(isValidAdminToken("Bearer super-secretx", "super-secret")).toBe(false);
  });
});
