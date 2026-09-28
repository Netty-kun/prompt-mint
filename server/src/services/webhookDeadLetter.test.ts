/**
 * Tests for dead-letter handling of unprocessable contract events (issue #97):
 * a webhook delivery that exhausts every retry gets persisted as a
 * WebhookDeadLetter (not just logged as a failed WebhookDelivery row), and
 * can be replayed later via replayDeadLetter().
 *
 * `../../../src/lib/api/payloadVersion` lives outside this package's
 * tsconfig/jest project boundary (it's part of the root frontend project,
 * covered by its own vitest suite), so it's mocked here rather than
 * exercised for real — mirroring how WebhookSubscription/WebhookDelivery
 * are already mocked in webhookDispatcher.test.ts.
 */

jest.mock("../../../src/lib/api/payloadVersion", () => ({
  __esModule: true,
  WEBHOOK_SCHEMA_VERSION: "2025-01-01",
}));

jest.mock("../models/WebhookSubscription", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
  },
}));

jest.mock("../models/WebhookDelivery", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
  },
}));

jest.mock("../models/WebhookDeadLetter", () => ({
  __esModule: true,
  default: {
    create: jest.fn(),
    findById: jest.fn(),
  },
}));

import WebhookSubscription from "../models/WebhookSubscription";
import WebhookDeadLetter from "../models/WebhookDeadLetter";
import { dispatchEvent, replayDeadLetter } from "./webhookDispatcher";

const mockFind = WebhookSubscription.find as jest.Mock;
const mockFindByIdAndUpdate = WebhookSubscription.findByIdAndUpdate as jest.Mock;
const mockSubFindById = WebhookSubscription.findById as jest.Mock;
const mockDeadLetterCreate = WebhookDeadLetter.create as jest.Mock;
const mockDeadLetterFindById = WebhookDeadLetter.findById as jest.Mock;

const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFindByIdAndUpdate.mockResolvedValue({ failureCount: 1 });
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("dispatchEvent dead-letter behavior", () => {
  it("records a dead letter once every retry is exhausted", async () => {
    jest.useFakeTimers();
    mockFind.mockResolvedValue([{ _id: "sub1", url: "https://example.com/hook", secret: "s1" }]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const dispatchPromise = dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "1" });
    await Promise.resolve();
    await jest.runAllTimersAsync();
    await dispatchPromise;
    jest.useRealTimers();

    expect(mockDeadLetterCreate).toHaveBeenCalledTimes(1);
    expect(mockDeadLetterCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionId: "sub1",
        event: "PromptPurchased",
        attempts: 4, // MAX_RETRIES (3) + the initial attempt
        lastStatusCode: 500,
        payload: expect.objectContaining({ event: "PromptPurchased" }),
      }),
    );
  });

  it("does not record a dead letter when delivery eventually succeeds", async () => {
    jest.useFakeTimers();
    mockFind.mockResolvedValue([{ _id: "sub1", url: "https://example.com/hook", secret: "s1" }]);
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error("network blip"))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const dispatchPromise = dispatchEvent("GCREATOR", "PromptPurchased", {});
    await Promise.resolve();
    await jest.runAllTimersAsync();
    await dispatchPromise;
    jest.useRealTimers();

    expect(mockDeadLetterCreate).not.toHaveBeenCalled();
  });

  it("a dispatch failure for one subscription doesn't block a dead letter for another", async () => {
    jest.useFakeTimers();
    mockFind.mockResolvedValue([
      { _id: "sub-fail", url: "https://fail.example.com/hook", secret: "s1" },
      { _id: "sub-ok", url: "https://ok.example.com/hook", secret: "s2" },
    ]);
    global.fetch = jest.fn().mockImplementation((url: string) =>
      url.includes("fail")
        ? Promise.resolve({ ok: false, status: 500 })
        : Promise.resolve({ ok: true, status: 200 }),
    );

    const dispatchPromise = dispatchEvent("GCREATOR", "PromptPurchased", {});
    await Promise.resolve();
    await jest.runAllTimersAsync();
    await dispatchPromise;
    jest.useRealTimers();

    expect(mockDeadLetterCreate).toHaveBeenCalledTimes(1);
    expect(mockDeadLetterCreate).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: "sub-fail" }),
    );
  });
});

describe("replayDeadLetter", () => {
  it("marks the dead letter resolved on a successful replay", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const deadLetter = {
      _id: "dl1",
      subscriptionId: "sub1",
      attempts: 4,
      payload: { event: "PromptPurchased", deliveryId: "d1", data: {} },
      resolved: false,
      resolvedAt: null,
      save,
    };
    mockDeadLetterFindById.mockResolvedValue(deadLetter);
    mockSubFindById.mockResolvedValue({ _id: "sub1", url: "https://example.com/hook", secret: "s1" });
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await replayDeadLetter("dl1");

    expect(result).toEqual({ success: true });
    expect(deadLetter.resolved).toBe(true);
    expect(deadLetter.resolvedAt).toBeInstanceOf(Date);
    expect(save).toHaveBeenCalled();
  });

  it("leaves the dead letter unresolved and updates its error on a failed replay", async () => {
    const save = jest.fn().mockResolvedValue(undefined);
    const deadLetter = {
      _id: "dl1",
      subscriptionId: "sub1",
      attempts: 4,
      payload: { event: "PromptPurchased", deliveryId: "d1", data: {} },
      resolved: false,
      resolvedAt: null,
      lastError: null,
      lastStatusCode: null,
      save,
    };
    mockDeadLetterFindById.mockResolvedValue(deadLetter);
    mockSubFindById.mockResolvedValue({ _id: "sub1", url: "https://example.com/hook", secret: "s1" });
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await replayDeadLetter("dl1");

    expect(result).toEqual({ success: false, statusCode: 503, error: expect.any(String) });
    expect(deadLetter.resolved).toBe(false);
    expect(deadLetter.attempts).toBe(5);
    expect(save).toHaveBeenCalled();
  });

  it("throws when the dead letter does not exist", async () => {
    mockDeadLetterFindById.mockResolvedValue(null);

    await expect(replayDeadLetter("missing")).rejects.toThrow("not found");
  });
});
