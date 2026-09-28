// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WEBHOOK_SCHEMA_VERSION } from "./payloadVersion";

// ── Mocks ─────────────────────────────────────────────────────────────────────

// Mock the WebhookSubscription Mongoose model before importing the dispatcher
vi.mock("../../../server/src/models/WebhookSubscription", () => {
  const findMock = vi.fn();
  const findByIdAndUpdateMock = vi.fn();
  return {
    default: {
      find: findMock,
      findByIdAndUpdate: findByIdAndUpdateMock,
    },
  };
});

// Capture outbound fetch calls instead of making real HTTP requests
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { dispatchEvent, type WebhookPayload } from "../../../server/src/services/webhookDispatcher";
import WebhookSubscription from "../../../server/src/models/WebhookSubscription";

const findMock = (WebhookSubscription as any).find as ReturnType<typeof vi.fn>;
const findByIdAndUpdateMock = (WebhookSubscription as any).findByIdAndUpdate as ReturnType<typeof vi.fn>;

function makeSubscription(overrides: Partial<{
  _id: string; url: string; secret: string; events: string[];
}> = {}) {
  return {
    _id: overrides._id ?? "sub_test_id",
    url: overrides.url ?? "https://example.com/webhook",
    secret: overrides.secret ?? "test-secret-32-bytes-xxxxxxxxxxxx",
    events: overrides.events ?? ["PromptPurchased"],
  };
}

// ── schemaVersion in outbound payload ────────────────────────────────────────

describe("WebhookPayload schemaVersion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMock.mockResolvedValue([]);
    findByIdAndUpdateMock.mockResolvedValue({ failureCount: 0 });
  });

  it("WebhookPayload interface requires schemaVersion", () => {
    // Compile-time check: constructing a valid payload must include schemaVersion
    const payload: WebhookPayload = {
      schemaVersion: WEBHOOK_SCHEMA_VERSION,
      event: "PromptPurchased",
      deliveryId: "test-uuid",
      timestamp: new Date().toISOString(),
      data: { promptId: "1", buyer: "GBUYER" },
    };
    expect(payload.schemaVersion).toBe(WEBHOOK_SCHEMA_VERSION);
  });

  it("dispatched payload body contains schemaVersion matching WEBHOOK_SCHEMA_VERSION", async () => {
    const sub = makeSubscription();
    findMock.mockResolvedValue([sub]);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "42", buyer: "GBUYER" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as WebhookPayload;
    expect(body.schemaVersion).toBe(WEBHOOK_SCHEMA_VERSION);
  });

  it("dispatched payload body contains all required envelope fields", async () => {
    const sub = makeSubscription();
    findMock.mockResolvedValue([sub]);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "42", buyer: "GBUYER" });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string) as WebhookPayload;
    expect(body.schemaVersion).toBe(WEBHOOK_SCHEMA_VERSION);
    expect(body.event).toBe("PromptPurchased");
    expect(typeof body.deliveryId).toBe("string");
    expect(body.deliveryId.length).toBeGreaterThan(0);
    expect(typeof body.timestamp).toBe("string");
    expect(body.data).toMatchObject({ promptId: "42", buyer: "GBUYER" });
  });

  it("X-PromptHash-Schema-Version delivery header equals WEBHOOK_SCHEMA_VERSION", async () => {
    const sub = makeSubscription();
    findMock.mockResolvedValue([sub]);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "1" });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-PromptHash-Schema-Version"]).toBe(WEBHOOK_SCHEMA_VERSION);
  });

  it("X-PromptHash-Event header matches the dispatched event name", async () => {
    const sub = makeSubscription();
    findMock.mockResolvedValue([sub]);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await dispatchEvent("GCREATOR", "PromptPurchased", {});

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-PromptHash-Event"]).toBe("PromptPurchased");
  });
});

// ── Delivery behaviour ────────────────────────────────────────────────────────

describe("dispatchEvent delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdAndUpdateMock.mockResolvedValue({ failureCount: 0 });
  });

  it("does nothing when there are no active subscriptions", async () => {
    findMock.mockResolvedValue([]);
    await dispatchEvent("GNOBODY", "PromptPurchased", {});
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("schemaVersion in the body is identical across retry attempts", async () => {
    const sub = makeSubscription();
    findMock.mockResolvedValue([sub]);

    // First two attempts fail, third succeeds
    fetchMock
      .mockRejectedValueOnce(new Error("network error"))
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({ ok: true, status: 200 });

    vi.useFakeTimers();
    const dispatchPromise = dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "5" });
    await vi.runAllTimersAsync();
    await dispatchPromise;
    vi.useRealTimers();

    for (const call of fetchMock.mock.calls) {
      const body = JSON.parse(call[1].body as string) as WebhookPayload;
      expect(body.schemaVersion).toBe(WEBHOOK_SCHEMA_VERSION);
    }
  });

  it("does not deliver to subscriptions for a different event type", async () => {
    // find() query already filters by event; simulate it returning nothing
    findMock.mockResolvedValue([]);
    await dispatchEvent("GCREATOR", "SomeOtherEvent", {});
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── HMAC signature header ─────────────────────────────────────────────────────

describe("dispatchEvent HMAC signing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findByIdAndUpdateMock.mockResolvedValue({ failureCount: 0 });
  });

  it("X-PromptHash-Signature header is present and prefixed with 'sha256='", async () => {
    const sub = makeSubscription();
    findMock.mockResolvedValue([sub]);
    fetchMock.mockResolvedValue({ ok: true, status: 200 });

    await dispatchEvent("GCREATOR", "PromptPurchased", { promptId: "7" });

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers["X-PromptHash-Signature"]).toMatch(/^sha256=[0-9a-f]{64}$/);
  });
});
