/**
 * Tests for the analytics rollup pipeline (issue #288). Mongoose models
 * and the connection state are mocked so no live MongoDB is required,
 * mirroring the pattern in analyticsEvents.test.ts.
 */

jest.mock("mongoose", () => {
  const actual = jest.requireActual("mongoose");
  return {
    ...actual,
    connection: { readyState: 1 },
  };
});

jest.mock("../models/Purchase", () => ({
  __esModule: true,
  default: {
    aggregate: jest.fn(),
  },
}));

jest.mock("../models/AnalyticsRollup", () => ({
  __esModule: true,
  AnalyticsRollup: {
    findOneAndUpdate: jest.fn(),
    find: jest.fn(),
  },
}));

import Purchase from "../models/Purchase";
import { AnalyticsRollup } from "../models/AnalyticsRollup";
import { getRecentRollups, runAnalyticsRollup } from "./analyticsRollup";

const mockAggregate = Purchase.aggregate as jest.Mock;
const mockFindOneAndUpdate = AnalyticsRollup.findOneAndUpdate as jest.Mock;
const mockFind = AnalyticsRollup.find as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("runAnalyticsRollup", () => {
  it("upserts today's totals from the Purchase aggregation", async () => {
    mockAggregate.mockResolvedValue([{ salesCount: 5, volumeStroops: 50_000, activeUsers: 3 }]);
    mockFindOneAndUpdate.mockResolvedValue({});

    await runAnalyticsRollup();

    expect(mockAggregate).toHaveBeenCalledTimes(1);
    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      { date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/) },
      expect.objectContaining({
        salesCount: 5,
        volumeStroops: 50_000,
        activeUsers: 3,
        lastRolledUpAt: expect.any(Date),
      }),
      { upsert: true, setDefaultsOnInsert: true },
    );
  });

  it("upserts zeroed totals when there are no purchases today", async () => {
    mockAggregate.mockResolvedValue([]);
    mockFindOneAndUpdate.mockResolvedValue({});

    await runAnalyticsRollup();

    expect(mockFindOneAndUpdate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ salesCount: 0, volumeStroops: 0, activeUsers: 0 }),
      expect.any(Object),
    );
  });

  it("logs and swallows aggregation errors rather than throwing", async () => {
    mockAggregate.mockRejectedValue(new Error("db down"));
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await expect(runAnalyticsRollup()).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe("getRecentRollups", () => {
  it("bounds the requested window to [1, 365] days", async () => {
    mockFind.mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    });

    await getRecentRollups(0);
    await getRecentRollups(10_000);

    expect(mockFind).toHaveBeenCalledTimes(2);
  });
});
