/**
 * Tests for issue #67 – Copy-to-clipboard feedback
 *
 * Primary success paths:
 *   - Clicking the button calls copyToClipboard with the provided value.
 *   - The aria-label updates to reflect success immediately after a successful copy.
 *
 * Failure / edge-case paths:
 *   - If clipboard API fails, it sets the error state and displays the error message.
 *   - aria-label indicates failure state.
 */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { CopyButton } from "@/components/CopyButton";
import * as clipboardModule from "@/lib/clipboard/secureClipboard";

vi.mock("@/lib/clipboard/secureClipboard", () => ({
  copyToClipboard: vi.fn(),
}));

describe("CopyButton – #67", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies value to clipboard and shows success state", async () => {
    vi.mocked(clipboardModule.copyToClipboard).mockResolvedValue({ success: true });
    
    render(<CopyButton value="secret-hash" label="hash" />);
    
    const btn = screen.getByRole("button", { name: "Copy hash" });
    await user.click(btn);

    expect(clipboardModule.copyToClipboard).toHaveBeenCalledWith("secret-hash");
    
    // Check that aria-label updated to success state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "hash copied" })).toBeTruthy();
    });
  });

  it("shows error feedback if copy fails", async () => {
    vi.mocked(clipboardModule.copyToClipboard).mockResolvedValue({ success: false, error: "Not allowed" });
    
    render(<CopyButton value="secret-hash" label="hash" />);
    
    const btn = screen.getByRole("button", { name: "Copy hash" });
    await user.click(btn);
    
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Failed to copy hash" })).toBeTruthy();
      expect(screen.getByRole("alert")).toHaveTextContent("Not allowed");
    });
  });

  it("renders different variants correctly", () => {
    const { rerender } = render(<CopyButton value="test" variant="icon" label="t1" />);
    expect(screen.getByRole("button", { name: "Copy t1" })).toBeTruthy();
    
    rerender(<CopyButton value="test" variant="icon-text" label="t2" />);
    expect(screen.getByText("Copy")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy t2" })).toBeTruthy();
    
    rerender(<CopyButton value="test" variant="inline" label="t3" />);
    expect(screen.getByRole("button", { name: "Copy t3" })).toBeTruthy();
  });
});
