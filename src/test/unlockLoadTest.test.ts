// @vitest-environment node
import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";

describe("Unlock API Stress & Load Test Suite (Issue #223)", () => {
  const k6ScriptPath = path.resolve(__dirname, "../../load-tests/unlock-endpoint-load-test.js");
  const docPath = path.resolve(__dirname, "../../load-tests/UNLOCK_LOAD_TEST_RESULTS.md");

  it("should have valid k6 load testing script defining 100/500/1000 VU scenarios", () => {
    expect(fs.existsSync(k6ScriptPath)).toBe(true);
    const content = fs.readFileSync(k6ScriptPath, "utf-8");
    expect(content).toContain("100_users");
    expect(content).toContain("500_users");
    expect(content).toContain("1000_users");
    expect(content).toContain("unlock_request_duration");
  });

  it("should document load test benchmark results and bottlenecks", () => {
    expect(fs.existsSync(docPath)).toBe(true);
    const docContent = fs.readFileSync(docPath, "utf-8");
    expect(docContent).toContain("100 Concurrent Users");
    expect(docContent).toContain("500 Concurrent Users");
    expect(docContent).toContain("1,000 Concurrent Users");
    expect(docContent).toContain("Identified Bottlenecks");
  });
});
