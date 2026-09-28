import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReducedMotionProvider, useReducedMotion } from "./ReducedMotionProvider";

function TestComponent() {
  const { prefersReducedMotion } = useReducedMotion();
  return (
    <div>
      <span data-testid="reduced-motion-value">{String(prefersReducedMotion)}</span>
    </div>
  );
}

describe("ReducedMotionProvider", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("provides false when prefers-reduced-motion is not set", () => {
    render(
      <ReducedMotionProvider>
        <TestComponent />
      </ReducedMotionProvider>,
    );
    expect(screen.getByTestId("reduced-motion-value")).toHaveTextContent("false");
  });

  it("provides true when prefers-reduced-motion is reduce", () => {
    vi.spyOn(window, "matchMedia").mockImplementation((query) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(
      <ReducedMotionProvider>
        <TestComponent />
      </ReducedMotionProvider>,
    );
    expect(screen.getByTestId("reduced-motion-value")).toHaveTextContent("true");
  });

  it("renders children", () => {
    render(
      <ReducedMotionProvider>
        <div>child</div>
      </ReducedMotionProvider>,
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });
});
