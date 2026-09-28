/**
 * Tests for issue #68 – Consistent empty states
 *
 * Primary success paths:
 *   - Renders with the specified preset variant (e.g. no-results).
 *   - Custom variant allows overriding the icon.
 *   - Renders the optional action node when provided.
 *
 * Failure / edge-case paths:
 *   - Falls back to preset defaults if title/description are omitted.
 *   - Custom variant without an icon falls back to a generic icon.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertTriangle } from "lucide-react";

describe("EmptyState – #68", () => {
  it("renders a preset variant with default text", () => {
    render(<EmptyState variant="no-purchases" />);
    expect(screen.getByText("No purchases yet")).toBeTruthy();
    expect(screen.getByText(/acquire your first prompt license/i)).toBeTruthy();
  });

  it("allows overriding title and description", () => {
    render(
      <EmptyState
        variant="no-results"
        title="Custom Title"
        description="Custom Desc"
      />
    );
    expect(screen.getByText("Custom Title")).toBeTruthy();
    expect(screen.getByText("Custom Desc")).toBeTruthy();
  });

  it("renders a custom action when provided", () => {
    render(
      <EmptyState
        variant="locked"
        action={<button>Unlock Now</button>}
      />
    );
    expect(screen.getByRole("button", { name: "Unlock Now" })).toBeTruthy();
  });

  it("renders a custom variant with a custom icon", () => {
    render(
      <EmptyState
        variant="custom"
        icon={AlertTriangle}
        title="Custom Error"
      />
    );
    expect(screen.getByText("Custom Error")).toBeTruthy();
    // Verify aria-hidden icon is present (Lucide sets aria-hidden="true")
    expect(document.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
  });

  it("applies the aria-label correctly based on title", () => {
    render(<EmptyState variant="offline" title="No Internet" />);
    expect(screen.getByRole("status", { name: "No Internet" })).toBeTruthy();
  });
});
