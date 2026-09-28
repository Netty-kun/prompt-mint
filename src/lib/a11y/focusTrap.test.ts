import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createFocusTrapKeydownHandler,
  getFocusableElements,
} from "./focusTrap";

function buildDialog() {
  const root = document.createElement("div");
  root.setAttribute("role", "dialog");
  root.innerHTML = `
    <button id="first">First</button>
    <input id="middle" />
    <button id="disabled" disabled>Disabled</button>
    <button id="last">Last</button>
  `;
  document.body.appendChild(root);
  return root;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("getFocusableElements", () => {
  it("returns tabbable elements in DOM order and skips disabled ones", () => {
    const root = buildDialog();
    const ids = getFocusableElements(root).map((el) => el.id);
    expect(ids).toEqual(["first", "middle", "last"]);
  });
});

describe("createFocusTrapKeydownHandler", () => {
  it("closes the dialog on Escape", () => {
    const root = buildDialog();
    const onEscape = vi.fn();
    const handler = createFocusTrapKeydownHandler({
      container: () => root,
      onEscape,
    });
    handler(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(onEscape).toHaveBeenCalledOnce();
  });

  it("wraps focus from last to first on Tab", () => {
    const root = buildDialog();
    const last = root.querySelector<HTMLElement>("#last")!;
    const first = root.querySelector<HTMLElement>("#first")!;
    last.focus();
    expect(document.activeElement).toBe(last);

    const handler = createFocusTrapKeydownHandler({
      container: () => root,
      onEscape: vi.fn(),
    });
    const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });
    handler(event);

    expect(document.activeElement).toBe(first);
    expect(event.defaultPrevented).toBe(true);
  });

  it("wraps focus from first to last on Shift+Tab", () => {
    const root = buildDialog();
    const last = root.querySelector<HTMLElement>("#last")!;
    const first = root.querySelector<HTMLElement>("#first")!;
    first.focus();

    const handler = createFocusTrapKeydownHandler({
      container: () => root,
      onEscape: vi.fn(),
    });
    const event = new KeyboardEvent("keydown", {
      key: "Tab",
      shiftKey: true,
      cancelable: true,
    });
    handler(event);

    expect(document.activeElement).toBe(last);
    expect(event.defaultPrevented).toBe(true);
  });

  it("does nothing for non-trap keys", () => {
    const root = buildDialog();
    const onEscape = vi.fn();
    const handler = createFocusTrapKeydownHandler({
      container: () => root,
      onEscape,
    });
    handler(new KeyboardEvent("keydown", { key: "a" }));
    expect(onEscape).not.toHaveBeenCalled();
  });
});
