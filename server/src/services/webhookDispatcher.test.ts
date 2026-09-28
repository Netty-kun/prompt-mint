/**
 * Tests for the webhook dispatcher (issue #23): versioned payload envelope,
 * delivery-history logging, and failure-count/auto-disable bookkeeping.
 * Mongoose models are mocked so no live MongoDB connection is required,
 * mirroring the pattern in analyticsEvents.test.ts.
 */

// Lives outside this package's tsconfig/jest project boundary (part of the
// root frontend project, covered by its own vitest suite) — mocked here
// the same way the Mongoose models below are mocked.
jest.mock("../../../src/lib/api/payloadVersion", () => ({
  __esModule: true,
  WEBHOOK_SCHEMA_VERSION: "2025-01-01",
}));

jest.mock("../models/WebhookSubscription", () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
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
  },
}));

import WebhookSubscription from "../models/WebhookSubscription";
import WebhookDelivery from "../models/WebhookDelivery";
import { buildWebhookPayload, dispatchEvent, sendTestEvent, WEBHOOK_PAYLOAD_VERSION } from "./webhookDispatcher";

const mockFind = WebhookSubscription.find as jest.Mock;
const mockFindByIdAndUpdate = WebhookSubscription.findByIdAndUpdate as jest.Mock;
const mockDeliveryCreate = WebhookDelivery.create as jest.Mock;

const originalFetch = global.fetch;

beforeEach(() => {
  jest.clearAllMocks();
  mockFindByIdAndUpdate.mockResolvedValue({ failureCount: 1 });
  mockDeliveryCreate.mockResolvedValue({});
});

afterAll(() => {
  global.fetch = originalFetch;
});

describe("buildWebhookPayload", () => {
  it("includes a version, unique delivery id, timestamp, and the event data", () => {
    const payload = buildWebhookPayload("PromptPurchased", { promptId: "1" });
    expect(payload.version).toBe(WEBHOOK_PAYLOAD_VERSION);
    expect(payload.event).toBe("PromptPurchased");
    expect(payload.deliveryId).toEqual(expect.any(String));
    expect(payload.timestamp).toEqual(expect.any(String));
    expect(payload.data).toEqual({ promptId: "1" });
  });

  it("generates a distinct deliveryId per call", () => {
    const a = buildWebhookPayload("PromptPurchased", {});
    const b = buildWebhookPayload("PromptPurchased", {});
    expect(a.deliveryId).not.toBe(b.deliveryId);
  });
});

describe("dispatchEvent", () => {
  it("delivers to every active subscription for the wallet subscribed to that event, and logs success", async () => {
    mockFind.mockResolvedValue([
      { _id: "sub1", url: "https://example.com/hook", secret: "s1" },
    ]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "1" });

    expect(mockFind).toHaveBeenCalledWith({
      walletAddress: "gcreator",
      active: true,
      events: "PromptPurchased",
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(mockDeliveryCreate).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionId: "sub1", success: true, attempt: 0 }),
    );
    expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
      "sub1",
      expect.objectContaining({ lastDeliveredAt: expect.any(Date) }),
    );
  });

  it("signs the request body and stamps version/event/delivery headers", async () => {
    mockFind.mockResolvedValue([{ _id: "sub1", url: "https://example.com/hook", secret: "s1" }]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    await dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "1" });

    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    expect(init.headers["X-PromptHash-Signature"]).toMatch(/^sha256=/);
    expect(init.headers["X-PromptHash-Version"]).toBe(String(WEBHOOK_PAYLOAD_VERSION));
    expect(init.headers["X-PromptHash-Event"]).toBe("PromptPurchased");
  });

  it("logs a failed delivery attempt with the status code", async () => {
    jest.useFakeTimers();
    mockFind.mockResolvedValue([{ _id: "sub1", url: "https://example.com/hook", secret: "s1" }]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    const dispatchPromise = dispatchEvent("GCREATOR", "PromptPurchased", {});
    // Drain all pending retry timers (bounded exponential backoff: 2s/4s/8s).
    await Promise.resolve();
    await jest.runAllTimersAsync();
    await dispatchPromise;

    expect(mockDeliveryCreate).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, statusCode: 500 }),
    );
    jest.useRealTimers();
  });
});

describe("sendTestEvent", () => {
  it("delivers a WebhookTest event immediately and reports success inline", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    const result = await sendTestEvent({ _id: "sub1", url: "https://example.com/hook", secret: "s1" });

    expect(result).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.event).toBe("WebhookTest");
  });

  it("reports failure inline without retrying", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 });

    const result = await sendTestEvent({ _id: "sub1", url: "https://example.com/hook", secret: "s1" });

    expect(result.success).toBe(false);
    expect(result.statusCode).toBe(503);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
