import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../render";
import { WalletButton } from "@/components/WalletButton";
import type { WalletContextType } from "@/providers/WalletProvider";
import { getSupportedWallets } from "@/util/wallet";

vi.mock("@/util/wallet", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/util/wallet")>();
  return {
    ...actual,
    getSupportedWallets: vi.fn(),
  };
});

const mockGetSupportedWallets = vi.mocked(getSupportedWallets);

describe("Wallet Connection States", () => {
  beforeEach(() => {
    mockGetSupportedWallets.mockReset();
    mockGetSupportedWallets.mockResolvedValue([
      { id: "freighter", name: "Freighter", type: "HOT_WALLET", isAvailable: true, isPlatformWrapper: false, icon: "", url: "" },
      { id: "albedo", name: "Albedo", type: "HOT_WALLET", isAvailable: true, isPlatformWrapper: false, icon: "", url: "" },
      { id: "xbull", name: "xBull", type: "HOT_WALLET", isAvailable: true, isPlatformWrapper: false, icon: "", url: "" },
    ]);
  });

  it("shows connect button when wallet is disconnected", () => {
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "idle",
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText(/connect/i)).toBeInTheDocument();
  });

  it("shows connecting state during wallet connection", () => {
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "connecting",
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    expect(screen.getByText(/opening wallet/i)).toBeInTheDocument();
  });

  it("shows connected wallet address when wallet is connected", () => {
    const mockAddress = "GCTESTADDRESS1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890";
    const mockWallet: Partial<WalletContextType> = {
      address: mockAddress,
      status: "connected",
      network: "TESTNET",
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    expect(screen.getByText(/GCTEST/i)).toBeInTheDocument();
  });

  it("calls connect function when connect button is clicked", async () => {
    const user = userEvent.setup();
    const mockConnect = vi.fn();
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "idle",
      connect: mockConnect,
      disconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    const connectButton = screen.getByRole("button");
    await user.click(connectButton);

    // Wait for the modal to open and freighter button to appear
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Freighter" })).toBeInTheDocument();
    });

    // Click the Freighter button
    await user.click(screen.getByRole("button", { name: "Freighter" }));

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalled();
    });
  });

  it("shows error state when wallet connection fails", () => {
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "error",
      error: "Failed to connect wallet",
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    expect(screen.getByText(/failed/i)).toBeInTheDocument();
  });

  it("shows reconnecting state when wallet is reconnecting", () => {
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "reconnecting",
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    expect(screen.getByText(/restoring session/i)).toBeInTheDocument();
  });

  it("shows disconnected state when wallet is disconnected", () => {
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "disconnected",
      error: "Wallet is locked",
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    expect(screen.getByText(/reconnect/i)).toBeInTheDocument();
  });

  it("wallet kit only shows available wallets", async () => {
    mockGetSupportedWallets.mockResolvedValue([
      { id: "freighter", name: "Freighter", type: "HOT_WALLET", isAvailable: true, isPlatformWrapper: false, icon: "", url: "" },
      { id: "albedo", name: "Albedo", type: "HOT_WALLET", isAvailable: true, isPlatformWrapper: false, icon: "", url: "" },
      { id: "xbull", name: "xBull", type: "HOT_WALLET", isAvailable: true, isPlatformWrapper: false, icon: "", url: "" },
    ]);

    const user = userEvent.setup();
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "idle",
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Freighter" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Albedo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "xBull" })).toBeInTheDocument();
  });

  it("shows error when no supported wallet is detected", async () => {
    mockGetSupportedWallets.mockResolvedValue([
      { id: "freighter", name: "Freighter", type: "HOT_WALLET", isAvailable: false, isPlatformWrapper: false, icon: "", url: "" },
      { id: "albedo", name: "Albedo", type: "HOT_WALLET", isAvailable: false, isPlatformWrapper: false, icon: "", url: "" },
      { id: "xbull", name: "xBull", type: "HOT_WALLET", isAvailable: false, isPlatformWrapper: false, icon: "", url: "" },
    ]);

    const user = userEvent.setup();
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "idle",
      connect: vi.fn(),
      disconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    await user.click(screen.getByRole("button", { name: /connect wallet/i }));

    await waitFor(() => {
      expect(screen.getByText(/no supported wallet extension detected/i)).toBeInTheDocument();
    });
  });

  it("shows connecting state during wallet reconnection", () => {
    const mockWallet: Partial<WalletContextType> = {
      address: undefined,
      status: "reconnecting",
      connect: vi.fn(),
      disconnect: vi.fn(),
      reconnect: vi.fn(),
    };

    renderWithProviders(<WalletButton />, { wallet: mockWallet });

    expect(screen.getByText(/restoring session/i)).toBeInTheDocument();
  });
});
