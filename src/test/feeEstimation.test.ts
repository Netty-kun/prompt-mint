import { describe, it, expect } from "vitest";
import {
  estimateSingleFee,
  estimateBulkFee,
  formatFeeEstimate,
} from "@/lib/checkout/feeEstimation";

describe("feeEstimation", () => {
  describe("estimateSingleFee", () => {
    it("returns a fee estimate with expected shape", async () => {
      const fee = await estimateSingleFee();
      expect(fee).toHaveProperty("baseFeeStroops");
      expect(fee).toHaveProperty("resourceFeeStroops");
      expect(fee).toHaveProperty("totalFeeStroops");
      expect(fee).toHaveProperty("totalFeeXlm");
    });

    it("returns a positive total fee", async () => {
      const fee = await estimateSingleFee();
      expect(fee.totalFeeStroops).toBeGreaterThan(0);
    });

    it("returns totalFeeXlm as a string representing the stroops value", async () => {
      const fee = await estimateSingleFee();
      const parsed = parseFloat(fee.totalFeeXlm);
      expect(Number.isFinite(parsed)).toBe(true);
      expect(parsed).toBeGreaterThan(0);
    });
  });

  describe("estimateBulkFee", () => {
    it("scales with item count", async () => {
      const single = await estimateBulkFee(1);
      const triple = await estimateBulkFee(3);
      expect(triple.totalFeeStroops).toBeGreaterThan(single.totalFeeStroops);
    });

    it("returns zero fee for zero items", async () => {
      const fee = await estimateBulkFee(0);
      expect(fee.totalFeeStroops).toBe(0);
      expect(fee.totalFeeXlm).toBe("0.0000000");
    });
  });

  describe("formatFeeEstimate", () => {
    it("formats a fee estimate as a human-readable string", async () => {
      const fee = await estimateSingleFee();
      const formatted = formatFeeEstimate(fee);
      expect(formatted).toContain("XLM");
      expect(formatted).toMatch(/^~\d/);
    });
  });
});
