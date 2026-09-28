import { describe, it, expect } from "vitest";
import {
  notificationsReducer,
  selectUnreadCount,
  variantForCategory,
  type NotificationRecord,
} from "./store";

function make(overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id: overrides.id ?? "n1",
    message: overrides.message ?? "hello",
    type: overrides.type ?? "primary",
    isRead: overrides.isRead ?? false,
    createdAt: overrides.createdAt ?? 1,
    ...overrides,
  };
}

describe("notificationsReducer", () => {
  it("adds a notification to the front", () => {
    const next = notificationsReducer([make({ id: "a" })], {
      type: "ADD",
      item: make({ id: "b" }),
    });
    expect(next.map((n) => n.id)).toEqual(["b", "a"]);
  });

  it("dedupes by id", () => {
    const next = notificationsReducer([make({ id: "a" })], {
      type: "ADD",
      item: make({ id: "a" }),
    });
    expect(next).toHaveLength(1);
  });

  it("dedupes by dedupeKey", () => {
    const start = [make({ id: "a", dedupeKey: "purchase:42" })];
    const next = notificationsReducer(start, {
      type: "ADD",
      item: make({ id: "b", dedupeKey: "purchase:42" }),
    });
    expect(next).toHaveLength(1);
  });

  it("allows distinct dedupeKeys", () => {
    const start = [make({ id: "a", dedupeKey: "purchase:42" })];
    const next = notificationsReducer(start, {
      type: "ADD",
      item: make({ id: "b", dedupeKey: "purchase:43" }),
    });
    expect(next).toHaveLength(2);
  });

  it("marks a single notification read", () => {
    const next = notificationsReducer(
      [make({ id: "a" }), make({ id: "b" })],
      { type: "MARK_READ", id: "a" },
    );
    expect(next.find((n) => n.id === "a")?.isRead).toBe(true);
    expect(next.find((n) => n.id === "b")?.isRead).toBe(false);
  });

  it("marks all read", () => {
    const next = notificationsReducer(
      [make({ id: "a" }), make({ id: "b" })],
      { type: "MARK_ALL_READ" },
    );
    expect(next.every((n) => n.isRead)).toBe(true);
  });

  it("clears and hydrates", () => {
    expect(notificationsReducer([make()], { type: "CLEAR" })).toEqual([]);
    const items = [make({ id: "x" })];
    expect(notificationsReducer([], { type: "HYDRATE", items })).toEqual(items);
  });
});

describe("selectUnreadCount", () => {
  it("counts only unread", () => {
    expect(
      selectUnreadCount([
        make({ id: "a", isRead: false }),
        make({ id: "b", isRead: true }),
        make({ id: "c", isRead: false }),
      ]),
    ).toBe(2);
  });
});

describe("variantForCategory", () => {
  it("maps categories to variants", () => {
    expect(variantForCategory("purchase")).toBe("success");
    expect(variantForCategory("expiry")).toBe("warning");
    expect(variantForCategory("price")).toBe("primary");
    expect(variantForCategory("follower")).toBe("secondary");
  });
});
