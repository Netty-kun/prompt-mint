/**
 * #270 – Accessibility helpers for modal dialogs.
 *
 * Extracted from PromptModal so the focus-trap / Escape behaviour can be
 * unit-tested in isolation and reused by any dialog surface.
 */

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/** Returns the tabbable elements inside `container`, in DOM order. */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter((el) => !el.hasAttribute("disabled"));
}

export interface FocusTrapOptions {
  /** Resolves the current dialog container (may be null before mount). */
  container: () => HTMLElement | null;
  /** Called when Escape is pressed — typically closes the dialog. */
  onEscape: () => void;
}

/**
 * Builds a `keydown` handler that:
 *  - closes the dialog on Escape, and
 *  - keeps Tab / Shift+Tab focus cycling within the container (focus trap).
 */
export function createFocusTrapKeydownHandler({
  container,
  onEscape,
}: FocusTrapOptions) {
  return (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onEscape();
      return;
    }

    if (event.key !== "Tab") return;

    const root = container();
    if (!root) return;

    const focusable = getFocusableElements(root);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      if (active === first || !root.contains(active)) {
        last.focus();
        event.preventDefault();
      }
    } else if (active === last) {
      first.focus();
      event.preventDefault();
    }
  };
}
