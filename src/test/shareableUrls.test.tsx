import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PromptDetailPage from "@/pages/prompt/page";
import CreatorSharePage from "@/pages/creator/page";
import { ShareLinkButton } from "@/components/ShareLinkButton";
import * as clipboard from "@/lib/clipboard/secureClipboard";

vi.mock("@/components/navigation", () => ({
  Navigation: () => <nav>Navigation</nav>,
}));

vi.mock("@/components/footer", () => ({
  Footer: () => <footer>Footer</footer>,
}));

vi.mock("@/pages/browse/PromptModal", () => ({
  PromptModal: ({ itemId }: { itemId: string }) => (
    <div data-testid="prompt-modal">Modal {itemId}</div>
  ),
}));

vi.mock("@/lib/stellar/promptHashClient", () => ({
  PromptHashClient: {
    getPrompt: vi.fn(),
  },
}));

vi.mock("@/lib/clipboard/secureClipboard", () => ({
  copyToClipboard: vi.fn(),
}));

import { PromptHashClient } from "@/lib/stellar/promptHashClient";

const VALID_CREATOR = "GAI4OWOTBCMC2IP5M3KS4KSF3ESIWNAFS3PSHQUBZRJA6KOCH2GY2I3K";

function renderAt(initialEntry: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/prompt/:id" element={<PromptDetailPage />} />
          <Route path="/creator/:address" element={<CreatorSharePage />} />
          <Route
            path="/profile"
            element={<div data-testid="profile-page">Profile</div>}
          />
          <Route path="/browse" element={<div>Browse</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("shareable marketplace URL pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an invalid prompt link error for bad ids", async () => {
    renderAt("/prompt/abc");

    expect(await screen.findByText("Invalid prompt link")).toBeInTheDocument();
    expect(
      screen.getByText(/Expected a non-negative integer/),
    ).toBeInTheDocument();
  });

  it("shows listing unavailable when getPrompt fails", async () => {
    vi.mocked(PromptHashClient.getPrompt).mockRejectedValue(
      new Error("Prompt #99 not found."),
    );

    renderAt("/prompt/99");

    expect(await screen.findByText("Listing unavailable")).toBeInTheDocument();
    expect(screen.getByText("Prompt #99 not found.")).toBeInTheDocument();
  });

  it("opens the listing modal for a valid prompt id", async () => {
    vi.mocked(PromptHashClient.getPrompt).mockResolvedValue({
      id: BigInt(7),
      title: "Shared Prompt",
      creator: VALID_CREATOR,
    } as never);

    renderAt("/prompt/7");

    expect(await screen.findByTestId("prompt-modal")).toHaveTextContent(
      "Modal 7",
    );
    expect(screen.getByText("Copy listing link")).toBeInTheDocument();
  });

  it("rejects invalid creator share URLs", async () => {
    renderAt("/creator/not-valid");

    expect(await screen.findByText("Invalid creator link")).toBeInTheDocument();
    expect(
      screen.getByText(/Expected a Stellar G/),
    ).toBeInTheDocument();
  });

  it("redirects valid creator URLs to the profile query deep link", async () => {
    renderAt(`/creator/${VALID_CREATOR}`);

    expect(await screen.findByTestId("profile-page")).toBeInTheDocument();
  });
});

describe("ShareLinkButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies the provided URL and surfaces success feedback", async () => {
    vi.mocked(clipboard.copyToClipboard).mockResolvedValue({ success: true });

    render(
      <ShareLinkButton url="https://app.example/prompt/1" label="Copy link" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(clipboard.copyToClipboard).toHaveBeenCalledWith(
        "https://app.example/prompt/1",
      );
      expect(screen.getByText("Link copied")).toBeInTheDocument();
    });
  });

  it("surfaces clipboard permission failures clearly", async () => {
    vi.mocked(clipboard.copyToClipboard).mockResolvedValue({
      success: false,
      error: "Clipboard access denied. Check browser permissions.",
    });

    render(
      <ShareLinkButton url="https://app.example/prompt/1" label="Copy link" />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => {
      expect(
        screen.getByText("Clipboard access denied. Check browser permissions."),
      ).toBeInTheDocument();
    });
  });
});
