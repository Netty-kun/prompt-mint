import { isValidAdminToken } from "../services/adminAuth";

describe("isValidAdminToken", () => {
  it("accepts a matching bearer token", () => {
    expect(isValidAdminToken("Bearer secret123", "secret123")).toBe(true);
  });

  it("fails closed when no admin token is configured", () => {
    expect(isValidAdminToken("Bearer anything", undefined)).toBe(false);
    expect(isValidAdminToken("Bearer anything", "")).toBe(false);
  });

  it("rejects a missing Authorization header", () => {
    expect(isValidAdminToken(undefined, "secret123")).toBe(false);
  });

  it("rejects a header without the Bearer prefix", () => {
    expect(isValidAdminToken("secret123", "secret123")).toBe(false);
  });

  it("rejects a mismatched token", () => {
    expect(isValidAdminToken("Bearer wrong", "secret123")).toBe(false);
  });
});
