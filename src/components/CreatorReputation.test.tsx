import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreatorReputationSignals } from "./CreatorReputation";

describe("CreatorReputationSignals", () => {
  it("renders neutral new-creator messaging and accessible signal explanations", () => {
    render(
      <CreatorReputationSignals
        reputation={{
          version: "creator-reputation-v1",
          calculatedAt: "2026-08-25T00:00:00.000Z",
          accountCreatedAt: null,
          accountAgeDays: null,
          completedSales: 0,
          upheldDisputes: 0,
          disputeRate: null,
          historyStatus: "new",
          historyLabel: "New creator — building marketplace history",
          verifiedLinks: [],
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Creator reputation signals" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("New creator — building marketplace history"),
    ).toBeInTheDocument();
    expect(screen.getByText("Not enough history")).toBeInTheDocument();
    expect(screen.queryByText(/unsafe/i)).not.toBeInTheDocument();
  });

  it("renders verified links with a descriptive accessible name", () => {
    render(
      <CreatorReputationSignals
        reputation={{
          version: "creator-reputation-v1",
          calculatedAt: "2026-08-25T00:00:00.000Z",
          accountCreatedAt: "2026-01-01T00:00:00.000Z",
          accountAgeDays: 236,
          completedSales: 10,
          upheldDisputes: 0,
          disputeRate: 0,
          historyStatus: "established",
          historyLabel: "Marketplace history available",
          verifiedLinks: [
            {
              label: "Portfolio",
              url: "https://creator.example",
              verifiedAt: "2026-08-20T00:00:00.000Z",
              verificationMethod: "domain-challenge",
            },
          ],
        }}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: "Open verified Portfolio link in a new tab",
      }),
    ).toHaveAttribute("href", "https://creator.example");
  });
});
