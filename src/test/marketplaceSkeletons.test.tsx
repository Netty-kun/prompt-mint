/**
 * Tests for issue #69 – Skeleton layouts matching final content
 *
 * Primary success paths:
 *   - Skeletons render with proper aria attributes indicating loading state.
 *   - Validates that PromptCardSkeleton, PromptModalSkeleton, and BuyerLibraryRowSkeleton
 *     render without crashing.
 *
 * Failure / edge-case paths:
 *   - Ensuring the aria-busy and aria-label attributes exist.
 */

import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  PromptCardSkeleton,
  PromptModalSkeleton,
  BuyerLibraryRowSkeleton,
} from "@/components/MarketplaceSkeletons";

describe("MarketplaceSkeletons – #69", () => {
  it("renders PromptCardSkeleton correctly", () => {
    render(<PromptCardSkeleton />);
    const el = screen.getByLabelText("Loading prompt");
    expect(el).toBeTruthy();
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("renders PromptModalSkeleton correctly", () => {
    render(<PromptModalSkeleton />);
    const el = screen.getByLabelText("Loading prompt details");
    expect(el).toBeTruthy();
    expect(el.getAttribute("aria-busy")).toBe("true");
  });

  it("renders BuyerLibraryRowSkeleton correctly", () => {
    render(<BuyerLibraryRowSkeleton />);
    const el = screen.getByLabelText("Loading library item");
    expect(el).toBeTruthy();
    expect(el.getAttribute("aria-busy")).toBe("true");
  });
});
